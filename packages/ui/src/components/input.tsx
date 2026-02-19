import { Input as AntInput, type InputProps as AntInputProps } from "antd";
import * as React from "react";

export interface InputProps extends AntInputProps {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ ...props }, ref) => {
    return (
      <AntInput
        ref={ref as any}
        {...(props as any)}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
