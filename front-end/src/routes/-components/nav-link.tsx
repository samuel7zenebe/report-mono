import { cn } from "@/lib/utils";
import { createLink, type LinkComponent } from "@tanstack/react-router";
import React from "react";

export type BasicLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  ref: React.Ref<HTMLAnchorElement>;
};

const BasicLink = ({ className, ref, ...props }: BasicLinkProps) => {
  return <a ref={ref} className={cn("", className)} {...props} />;
};

const CreatedLinkComponent = createLink(BasicLink);

export const NavLink: LinkComponent<typeof BasicLink> = (props) => {
  return <CreatedLinkComponent {...props} />;
};
