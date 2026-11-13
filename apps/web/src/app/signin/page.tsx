import type { Metadata } from "next";
import { SigninForm } from "./signin-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SigninPage() {
  return <SigninForm />;
}
