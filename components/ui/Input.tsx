import * as React from "react";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring focus:ring-blue-300 ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
