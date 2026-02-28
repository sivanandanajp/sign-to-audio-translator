from flask import Flask, jsonify, request
from flask_cors import CORS
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks.python import vision
from mediapipe.tasks.python.core.base_options import BaseOptions
import base64
import pyttsx3

app = Flask(__name__)
CORS(app, origins="*", allow_headers=["Content-Type"])

# -------------------- MEDIAPIPE --------------------

base_options = BaseOptions(
    model_asset_path=r"C:\Users\SREYA MAXWEL\Downloads\hand_landmarker.task"
)

options = vision.HandLandmarkerOptions(
    base_options=base_options,
    num_hands=1
)

detector = vision.HandLandmarker.create_from_options(options)

# -------------------- TTS --------------------

engine = pyttsx3.init()
engine.setProperty("rate", 170)
engine.setProperty("volume", 1.0)

last_prediction = ""

# -------------------- CLASSIFIER --------------------

def classify_sign(landmarks):
    pts = np.array([[lm.x, lm.y] for lm in landmarks])

    index_tip  = pts[8]
    index_base = pts[6]

    if index_tip[1] < index_base[1]:
        return "Finger Up"
    else:
        return "Finger Down"

# -------------------- ROUTES --------------------

@app.route("/")
def home():
    return jsonify({
        "message": "Sign Language API is running ✅",
        "endpoint": "/predict (POST only)"
    })

@app.route("/predict", methods=["POST"])
def predict():
    global last_prediction

    # ── Parse JSON body ──
    data = request.get_json(silent=True)
    if not data or "image" not in data:
        return jsonify({"error": "Missing 'image' field in request body"}), 400

    image_data = data["image"]

    # ── Strip the data-URL header if present ──
    # Expected format: "data:image/jpeg;base64,<actual_base64>"
    if "," in image_data:
        image_data = image_data.split(",", 1)[1]

    # ── Decode base64 → OpenCV frame ──
    try:
        image_bytes = base64.b64decode(image_data)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        frame  = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("cv2.imdecode returned None")
    except Exception as e:
        return jsonify({"error": f"Image decode failed: {str(e)}"}), 400

    # ── Run MediaPipe hand detection ──
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_image  = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
    detection_result = detector.detect(mp_image)

    prediction = "No Hand"
    confidence = 0.0

    if detection_result.hand_landmarks:
        hand_landmarks = detection_result.hand_landmarks[0]
        prediction = classify_sign(hand_landmarks)
        confidence = 0.9

        # ── Speak only when the sign changes ──
        if prediction != last_prediction:
            engine.say(prediction)
            engine.runAndWait()
            last_prediction = prediction

    return jsonify({
        "label":      prediction,
        "confidence": confidence
    })

# -------------------- RUN --------------------

if __name__ == "__main__":
    app.run(debug=True)
