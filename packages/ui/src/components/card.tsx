import { Card as AntCard } from "antd";
import * as React from "react";

// Card wrapper - uses Ant Design Card
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, style, ...props }, ref) => (
    <AntCard
      ref={ref as any}
      style={{ ...style }}
      {...(props as any)}
    >
      {children}
    </AntCard>
  )
);
Card.displayName = "Card";

// CardHeader - wrapper div inside card
const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, style, ...props }, ref) => (
    <div
      ref={ref}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.375rem",
        marginBottom: "1rem",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
);
CardHeader.displayName = "CardHeader";

// CardTitle - heading inside card header
const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ children, style, ...props }, ref) => (
    <h3
      ref={ref as any}
      style={{
        fontSize: "1.5rem",
        fontWeight: 600,
        lineHeight: 1,
        letterSpacing: "-0.02em",
        ...style,
      }}
      {...props}
    >
      {children}
    </h3>
  )
);
CardTitle.displayName = "CardTitle";

// CardDescription - subtitle in card header
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ children, style, ...props }, ref) => (
  <p
    ref={ref}
    style={{
      fontSize: "0.875rem",
      color: "#666",
      ...style,
    }}
    {...props}
  >
    {children}
  </p>
));
CardDescription.displayName = "CardDescription";

// CardContent - main content area
const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, style, ...props }, ref) => (
    <div
      ref={ref}
      style={{
        padding: "1.5rem",
        paddingTop: 0,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
);
CardContent.displayName = "CardContent";

// CardFooter - footer area at bottom
const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, style, ...props }, ref) => (
    <div
      ref={ref}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "1.5rem",
        paddingTop: 0,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
