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
    let requestOptions = {
      method: "GET",
      redirect: "follow",
    };
    try {
      const response = await fetch(
        `/api?prompt=${text}`,
        requestOptions as RequestInit
      );

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
      switch ((err as any).cause.status) {
        case 500:
          setErrorText("Something went wrong!");
          break;
      }
    }
  }

  const handleTranscribe = async () => {
    setLoading(true);
    if (text.length > 1000) {
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
            placeholder="Write normal text here... lim n->inf (n*2^n/3^n)"
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
            placeholder="Latex will appear here... \lim_{n\to\infty}\frac{n2^n}{3^n}"
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
