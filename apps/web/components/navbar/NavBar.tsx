interface Props { }
import ThemeToggle from "../themeToggle/themeToggle";
export default function NavBar(props: Props) {
  return (
    <>
      <div className="navbar bg-base-100 dark:bg-gray-dark">
        <a className="btn btn-ghost font-bold text-slate-900 dark:text-gray-light normal-case text-xl">
          T2L
        </a>
        <ThemeToggle></ThemeToggle>
      </div>
    </>
  );
}
