import React from "react";

type Props = {};

export default function Hero(props: Props) {
  return (
    <div className=" flex-col hero-content  font-sans dark:text-gray-light">
      <h1 className="m:text-6xl max-w-2xl font-bold text-slate-900 dark:text-gray-light text-7xl my-4">
        Text2Latex
      </h1>

      <p className="max-w-lg font-light">
        {" "}
        Text2Latex is an AI-powered tool that transcribes normal text, code and
        natural language to LaTeX.{" "}
      </p>
    </div >
  );
}
