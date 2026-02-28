# sign-to-audio-translator
Real-Time Sign Language Recognition and Speech Conversion System

This project is a real-time Sign Language Recognition system that detects hand gestures from live camera input and converts them into spoken language. It uses MediaPipe for extracting some hand landmarks and applies a simple rule-based approach to classify gestures. The backend is built with Flask, exposing a REST API that processes Base64-encoded image frames, and the recognized gesture is converted into speech using an offline TTS engine (pyttsx3). Currently, the system is trained to recognize only a limited set of predefined gestures, making it a lightweight prototype suitable for demonstrations and hackathon projects.
