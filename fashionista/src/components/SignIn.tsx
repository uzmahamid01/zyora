import React from "react";

interface SignInProps {
  onSignIn: (token: string) => void;
}

const SignIn: React.FC<SignInProps> = ({ onSignIn }) => {
    const handleGoogleSignIn = () => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError || !token) {
          alert(
            "Failed to sign in with Google: " +
              (chrome.runtime.lastError?.message || "Unknown error")
          );
          return;
        }

        // Store token in chrome storage for persistence
        chrome.storage.local.set({ token }, () => {
          console.log("Token stored in chrome.storage.local");
        });

        onSignIn(token);
      });
    };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <img src="Z.png" alt="ZYORA Logo" className="w-24 h-24 mb-6" />
      <h1 className="text-3xl font-bold mb-2 text-[#404040]">
        Welcome to ZYORA
      </h1>
      <p className="mb-8 text-[#404040]">Sign in to continue</p>
      <button
        onClick={handleGoogleSignIn}
        className="bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#222]"
      >
        Sign in with Google
      </button>
    </div>
  );
};

export default SignIn;
