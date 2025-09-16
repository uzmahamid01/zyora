import React from "react";

interface SignInProps {
  onSignIn: () => void; 
}

const SignIn: React.FC<SignInProps> = ({ onSignIn }) => {
  return (
    <div
      className="min-h-screen min-w-screen bg-cover bg-center text-center flex flex-col items-center justify-center"
      style={{ backgroundImage: "url('/cover3.png')" }}
    >
      <img src="Z.png" alt="ZYORA Logo" className="w-24 h-24 mb-2" />
      <h1 className="text-l mb-2 text-[#ffffff]">Welcome to ZYORA</h1>
      <button
        onClick={onSignIn}
        className="bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#222] hover:text-white transition"
      >
        Sign in with Google
      </button>
    </div>
  );
};

export default SignIn;
