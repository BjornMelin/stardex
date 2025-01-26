"use client";

import Link from "next/link";
import {
  GithubIcon,
  Linkedin,
  BookText,
  BookOpenCheck,
  Globe,
} from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand and Copyright */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Stardex</h3>
            <p className="text-sm text-foreground/60">
              © {new Date().getFullYear()} Bjorn Melin. All rights reserved.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Quick Links</h3>
            <nav className="flex flex-col space-y-2">
              <Link
                href="/about"
                className="text-sm text-foreground/60 hover:text-foreground"
              >
                About
              </Link>
              <Link
                href="/feedback"
                className="text-sm text-foreground/60 hover:text-foreground"
              >
                Feedback
              </Link>
            </nav>
          </div>

          {/* Social Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Connect</h3>
            <div className="flex space-x-4">
              <a
                href="https://github.com/bjornmelin"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground/60 hover:text-foreground"
                aria-label="GitHub"
              >
                <GithubIcon className="w-5 h-5" />
              </a>
              <a
                href="https://linkedin.com/in/bjorn-melin"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground/60 hover:text-foreground"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a
                href="https://medium.com/@bjornmelin"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground/60 hover:text-foreground"
                aria-label="Medium"
              >
                <BookText className="w-5 h-5" />
              </a>
              <a
                href="https://orcid.org/0009-0004-1978-3356"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground/60 hover:text-foreground"
                aria-label="ORCID"
              >
                <BookOpenCheck className="w-5 h-5" />
              </a>
              <a
                href="https://bjornmelin.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground/60 hover:text-foreground"
                aria-label="Personal Website"
              >
                <Globe className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
