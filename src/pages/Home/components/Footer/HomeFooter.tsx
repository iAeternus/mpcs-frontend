import { Layout } from "antd";
const { Footer } = Layout;

export const HomeFooter = () => {
  return (
    <Footer className="text-center bg-transparent text-white/70">
      <div className="space-x-4">
        <a
          href="https://github.com/iAeternus"
          target="_blank"
          className="hover:text-white"
        >
          GitHub
        </a>
        <a href="/about" className="hover:text-white">
          关于
        </a>
      </div>
      <div className="mt-2 text-sm opacity-70">
        © 2026 MPCS. All rights reserved.
      </div>
    </Footer>
  );
};
