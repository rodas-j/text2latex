import { use, useEffect, useState } from "react";
export default function ThemeToggle() {



    const [theme, setTheme] = useState<string>();

    useEffect(() => {
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('dark').matches)) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, []);

    // On page load or when changing themes, best to add inline in `head` to avoid FOUC
    useEffect(() => {
        if (theme === 'dark') {
            localStorage.theme = 'dark'
            document.documentElement.classList.add('dark')
        }
        else if (theme === 'light') {
            localStorage.theme = 'light'
            document.documentElement.classList.remove('dark')
        }

    }, [theme])



    // // Whenever the user explicitly chooses light mode
    // localStorage.theme = 'light'

    // // Whenever the user explicitly chooses dark mode
    // localStorage.theme = 'dark'

    // Whenever the user explicitly chooses to respect the OS preference
    //localStorage.removeItem('theme')

    const toggleTheme = () => {

        setTheme(() => theme === "dark" ? "light" : "dark");


    };



    return (
        <>
            <button onClick={toggleTheme} >
                Toggle to {theme}
            </button>
        </>
    );
}



// initially set the theme and "listen" for changes to apply them to the HTML tag
// useEffect(() => {
//     typeof (document) != "undefined" ? document.documentElement.classList.add(theme) : null;
//     theme === 'dark' ? 'light' : 'dark'
// }, [theme]);


// useEffect(() => {
//     localStorage.theme = theme

//     // if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
//     //     document.documentElement.classList.add('dark')
//     // } else {
//     //     document.documentElement.classList.remove('dark')
//     // }
// }, [theme]);
