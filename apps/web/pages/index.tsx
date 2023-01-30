import { Button } from "ui";
import Hero from "../components/hero/Hero";
import { useEffect, useState } from "react";
import Head from "next/head";

async function transcribe(text: string) {
  let requestOptions = {
    method: "GET",
    redirect: "follow",
  };
  const response = await fetch(
    `/api?prompt=${text}`,
    requestOptions as RequestInit
  );
  return await response.json();
}

export default function Web() {
  const [isTextLong, setIsTextLong] = useState(false);
  const [text, setText] = useState("");
  const [latex, setLatex] = useState("");
  const [loading, setLoading] = useState(false);
  const handleTranscribe = async () => {
    setLoading(true);
    if (text.length > 1000) {
      setIsTextLong(true);
      setLoading(false);
      return;
    }
    const response = await transcribe(text);
    setLatex(response.data);
    setLoading(false);
  };

  return (
    <>
      <Head>
        <link rel="icon" href="/image/favicon.ico" />
      </Head>
      <div className="flex p-5 flex-col justify-center items-center m-4">
        <div className="top-5">
          <Hero />
        </div>
        <p className="text-rose-600"> {isTextLong && "Text is too long"} </p>

        <div className="flex-col  justify-between min-w-lg p-5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write normal text here..."
            className={`textarea textarea-bordered textarea-md h-44 w-full min-w-lg ${
              isTextLong && "textarea-error"
            } `}
          ></textarea>

          <button onClick={handleTranscribe} className="btn btn-outlinel my-4">
            {loading && (
              <svg
                className="bg-white animate-spin h-4 w-4 mr-3 ..."
                viewBox="0 0 24 24"
              ></svg>
            )}
            Transcribe
          </button>

          <textarea
            value={latex}
            placeholder="Latex will appear here..."
            className="textarea textarea-bordered textarea-md h-44 w-full min-w-lg"
          ></textarea>
        </div>
      </div>
    </>
  );
}
