"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={async () => {
        await signOut({ redirect: false });
        window.location.href = "/admin/login";
      }}
      className="btn btn-ghost btn-sm text-stone-500 cursor-pointer focus:outline-none focus:ring-2 focus:ring-stone-300 focus:ring-offset-1 rounded-lg"
    >
      Sign out
    </button>
  );
}