from app import create_app

app = create_app()

if __name__ == '__main__':
    # Run on all network interfaces (0.0.0.0) to allow access from other devices
    # You can access the app from other devices using your computer's IP address
    print("\n" + "="*50)
    print("Server is running! Access the application from other devices on your network using:")
    print(f"- Frontend: http://<YOUR_IP>:5173")
    print(f"- Backend API: http://<YOUR_IP>:5000")
    print("="*50 + "\n")
    
    app.run(debug=True, host="0.0.0.0", port=5000)

