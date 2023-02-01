import { Button } from "ui";
import Hero from "../components/hero/Hero";
import { useEffect, useState } from "react";

import Head from "next/head";
import NavBar from "../components/navbar/NavBar";
import Footer from "../components/footer/Footer";

export default function Web() {
  const [copied, setCopied] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [isTextLong, setIsTextLong] = useState(false);
  const [text, setText] = useState("");
  const [latex, setLatex] = useState("");
  const [loading, setLoading] = useState(false);

  async function transcribe(text: string) {
    let myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    var raw = JSON.stringify({
      prompt: text,
    });
    let requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };
    try {
      const response = await fetch("/api", requestOptions as RequestInit);
      console.log(response);

      if (!response.ok) {
        const data = await response.json();
        setErrorText(data ? data.error : "Something went wrong!");
        throw new Error("Something went wrong!", {
          cause: response,
        });
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setErrorText("Something went wrong!");
      console.log(err);
    }
  }
  const exampleInput = `limit n->0 (5^n/n^2)`;
  const example2Input = `sum from 1 to n of n/2`;
  const example3Input = `integral of x^2 + 2x + 1 from 0 to 1`;

  const exampleOutput = `\\lim_{n\\to 0} \\frac{5^n}{n^2}`;
  const example2Output = `\\sum_{n=1}^n \\frac{n}{2}`;
  const example3Output = "\\int_{0}^{1} (x^2 + 2x + 1) , dx";

  const handleTranscribe = async () => {
    console.log("transcribing");
    setLoading(true);
    if (text.length > 1000) {
      console.log("text is too long");
      setIsTextLong(true);
      setLoading(false);
      return;
    }

    const response = await transcribe(text);
    setLatex(response ? response.data : "");
    setLoading(false);
  };

  const defaults = {
    title: "Text2Latex",
    description:
      "Text2Latex is an AI-powered tool that transcribes normal text to LaTeX.",
    image: "og.png",
    url: "https://text2latex.com/",
  };

  return (
    <>
      <Head>
        <link rel="icon" href="/image/favicon.ico" />
        <title>{defaults.title}</title>
        <meta name="description" content={defaults.description} />

        {/*<!-- Google / Search Engine Tags -->*/}
        <meta itemProp="name" content={defaults.title} />
        <meta itemProp="description" content={defaults.description} />
        <meta itemProp="image" content={defaults.image} />
        <meta name="thumbnail" content={defaults.image} />

        {/*<!-- Facebook Meta Tags -->*/}
        <meta property="og:title" content={defaults.title} />
        <meta property="og:description" content={defaults.description} />
        <meta property="og:image" content={defaults.image} />
        <meta property="og:url" content={defaults.url} />
        <meta property="og:type" content="website" />

        {/*<!-- Twitter Meta Tags -->*/}
        <meta name="twitter:title" content={defaults.title} />
        <meta name="twitter:description" content={defaults.description} />
        <meta name="twitter:image" content={defaults.image} />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      <NavBar />
      <div className="flex p-5 flex-col justify-center items-center m-4">
        <div className="top-5">
          <Hero />
        </div>
        <p className="text-rose-600"> {isTextLong && "Text is too long"} </p>
        <p className="text-rose-600"> {errorText} </p>

        <div className="flex-col  justify-between min-w-lg p-5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Write normal text here... \n ${exampleInput} \n ${example2Input} \n ${example3Input}`}
            className={`textarea textarea-bordered textarea-md h-44 w-full min-w-lg border-2 rounded-none focus:outline-none focus:border-black  ${
              isTextLong && "textarea-error"
            } `}
          ></textarea>

          <button
            onClick={handleTranscribe}
            className="btn btn-outlinel bg-black my-4"
          >
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
            readOnly
            onClick={() => {
              navigator.clipboard.writeText(latex);
              if (!copied) {
                setCopied(true);
                setTimeout(() => {
                  setCopied(false);
                }, 2000);
              }
            }}
            placeholder={`Latex will appear here... \n ${exampleOutput} \n ${example2Output} \n ${example3Output}`}
            className="textarea textarea-bordered textarea-md h-44 w-full min-w-lg  disabled border-2 rounded-none focus:outline-none focus:border-black cursor-copy"
          ></textarea>
          {copied && (
            <div className="alert alert-success">
              <div>
                <span>Copied to Clipboard.</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
