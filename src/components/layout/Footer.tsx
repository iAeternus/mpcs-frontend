import { Layout } from "antd";

const { Footer } = Layout;

export const HomeFooter = () => {
  const footerStyle: React.CSSProperties = {
    textAlign: "center" as const,
    backgroundColor: "var(--color-surface-secondary)",
    borderTop: "1px solid var(--color-border-default)",
    padding: "12px 24px",
    color: "var(--color-text-tertiary)",
    fontSize: "var(--text-sm)",
  };

  return (
    <Footer style={footerStyle}>
      <div className="flex items-center justify-center gap-4">
        <a
          href="https://github.com/iAeternus"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-[var(--color-text-primary)]"
          style={{ color: "inherit" }}
        >
          GitHub
        </a>
        <span style={{ color: "var(--color-border-default)" }}>|</span>
        <a
          href="/about"
          className="transition-colors hover:text-[var(--color-text-primary)]"
          style={{ color: "inherit" }}
        >
          关于
        </a>
      </div>
      <div className="mt-1 text-xs" style={{ opacity: 0.7 }}>
        © 2026 MPCS. All rights reserved.
      </div>
    </Footer>
  );
};

export default HomeFooter;