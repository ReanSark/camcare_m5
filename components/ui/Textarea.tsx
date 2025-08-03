import * as React from "react";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring focus:ring-blue-300 ${className}`}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
