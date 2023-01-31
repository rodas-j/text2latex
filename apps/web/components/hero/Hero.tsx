import React from "react";

type Props = {};

export default function Hero(props: Props) {
  return (
    <div className=" flex-col hero-content  font-sans">
      <h1 className="font-light text-7xl my-4">Text2Latex</h1>
      <p className="max-w-lg font-light">
        {" "}
        Welcome to Text2Latex! We are excited to offer you a fast and easy way
        to transcribe normal text to LaTeX. With our user-friendly interface,
        you can quickly convert any text into a beautifully formatted LaTeX
        document. Whether you&apos;re a student, researcher, or professional,
        our tool is perfect for anyone who needs to write complex mathematical
        equations or technical documents. Thank you for choosing us, and happy
        transcribing!
      </p>
    </div>
  );
}
