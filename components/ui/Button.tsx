import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const base = "px-4 py-2 rounded text-sm font-medium focus:outline-none";
    const styles =
      variant === "outline"
        ? "border border-blue-600 text-blue-600 bg-white hover:bg-blue-50"
        : "bg-blue-600 text-white hover:bg-blue-700";

    return (
      <button ref={ref} className={`${base} ${styles} ${className}`} {...props} />
    );
  }
);
Button.displayName = "Button";
