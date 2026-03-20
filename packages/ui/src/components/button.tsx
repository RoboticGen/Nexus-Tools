import * as React from "react";
import { Button as AntButton, type ButtonProps as AntButtonProps } from "antd";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  loading?: boolean;
  icon?: React.ReactNode;
  shape?: "circle" | "round" | "default";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "default", ...props }, ref) => {
    // Map variant to Ant Design props
    const getButtonType = (v: string): AntButtonProps["type"] => {
      switch (v) {
        case "default":
          return "primary";
        case "destructive":
          return "default";
        case "outline":
          return "dashed";
        case "secondary":
          return "default";
        case "ghost":
          return "text";
        case "link":
          return "link";
        default:
          return "primary";
      }
    };

    const getDanger = (v: string): boolean => v === "destructive";

    // Map size to Ant Design size
    const getSizeMap = (s: string): AntButtonProps["size"] => {
      switch (s) {
        case "default":
          return "middle";
        case "sm":
          return "small";
        case "lg":
          return "large";
        case "icon":
          return "middle";
        default:
          return "middle";
      }
    };

    const { className, ...restProps } = props;

    return (
      <AntButton
        ref={ref as any}
        type={getButtonType(variant)}
        danger={getDanger(variant)}
        size={getSizeMap(size)}
        {...(restProps as any)}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
