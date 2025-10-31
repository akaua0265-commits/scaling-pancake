import os
from flask import Flask, request, send_file, jsonify
from moviepy.editor import VideoFileClip, concatenate_videoclips
from pydub import AudioSegment
from pydub.silence import detect_silence
import tempfile
import logging
from flask_cors import CORS

# Configure logging
logging.basicConfig(level=logging.INFO)

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

def get_non_silent_chunks(audio_path, silence_thresh_db, min_silence_len_ms):
    """
    Detects non-silent chunks in an audio file.
    Returns a list of [start_sec, end_sec] for non-silent parts.
    """
    audio = AudioSegment.from_file(audio_path)
    logging.info(f"Detecting silence with threshold: {silence_thresh_db}dB and min length: {min_silence_len_ms}ms")

    silence_chunks = detect_silence(
        audio,
        min_silence_len=min_silence_len_ms,
        silence_thresh=silence_thresh_db
    )

    if not silence_chunks:
        logging.info("No silence detected.")
        return [(0, len(audio) / 1000.0)]

    # Invert silence chunks to get non-silent chunks
    non_silent_chunks = []
    last_end_ms = 0
    for start_ms, end_ms in silence_chunks:
        if start_ms > last_end_ms:
            non_silent_chunks.append((last_end_ms / 1000.0, start_ms / 1000.0))
        last_end_ms = end_ms
    
    if last_end_ms < len(audio):
        non_silent_chunks.append((last_end_ms / 1000.0, len(audio) / 1000.0))

    logging.info(f"Found {len(non_silent_chunks)} non-silent chunks.")
    return non_silent_chunks

@app.route('/process', methods=['POST'])
def process_video():
    if 'video' not in request.files:
        return jsonify({"error": "No video file provided"}), 400

    video_file = request.files['video']
    
    # Map frontend threshold (10-50%) to a dB value.
    # -60dB is very quiet, -10dB is loud.
    # A linear mapping: dB = -70 + threshold_percentage
    threshold_percent = float(request.form.get('threshold', 30))
    silence_thresh_db = -70 + threshold_percent
    min_silence_len_ms = 500

    temp_video_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
    video_file.save(temp_video_file.name)
    video_path = temp_video_file.name
    
    temp_audio_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    audio_path = temp_audio_file.name

    output_path = None

    try:
        logging.info(f"Processing video: {video_path}")
        video_clip = VideoFileClip(video_path)
        
        if video_clip.audio is None:
            return jsonify({"error": "Video file does not contain an audio track."}), 400

        video_clip.audio.write_audiofile(audio_path, codec='pcm_s16le')

        non_silent_timestamps = get_non_silent_chunks(audio_path, silence_thresh_db, min_silence_len_ms)

        if not non_silent_timestamps:
            return jsonify({"error": "No audio detected in the video"}), 400

        subclips = [video_clip.subclip(start, end) for start, end in non_silent_timestamps]
        
        final_clip = concatenate_videoclips(subclips)

        temp_output_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
        output_path = temp_output_file.name
        final_clip.write_videofile(output_path, codec="libx264", audio_codec="aac")

        logging.info(f"Successfully processed video. Sending file: {output_path}")
        
        return send_file(
            output_path,
            as_attachment=True,
            download_name=f"processed_{video_file.filename}",
            mimetype="video/mp4"
        )

    except Exception as e:
        logging.error(f"Error processing video: {e}", exc_info=True)
        return jsonify({"error": "An internal error occurred during video processing."}), 500
    finally:
        # Clean up temporary files
        if os.path.exists(video_path):
            os.remove(video_path)
        if os.path.exists(audio_path):
            os.remove(audio_path)
        if output_path and os.path.exists(output_path):
            os.remove(output_path)

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))