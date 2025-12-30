"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const REPO_OWNER = "bjornmelin";
const REPO_NAME = "stardex";
const MAX_FEEDBACK_LENGTH = 4000; // Safe limit for URL encoding

function buildIssueUrl(feedback: string): string {
  const url = new URL(`https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/new`);
  url.searchParams.set("title", "Stardex feedback");
  url.searchParams.set("body", feedback.slice(0, MAX_FEEDBACK_LENGTH));
  return url.toString();
}

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const issueUrl = useMemo(() => buildIssueUrl(feedback), [feedback]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      window.open(issueUrl, "_blank", "noopener,noreferrer");
      toast({
        title: "Feedback Submitted",
        description:
          "Thanks! A GitHub issue draft was opened in a new tab. Submit it when you're ready.",
      });
      setFeedback("");
    } catch {
      toast({
        title: "Error",
        description: "Failed to open GitHub. Please try copying the feedback instead.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Feedback</h1>
          <p className="text-lg text-muted-foreground">
            Help improve Stardex by sharing your thoughts and suggestions. For security reasons,
            feedback is submitted via a GitHub issue draft (no tokens stored in the site).
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                placeholder="Share your feedback..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="min-h-[200px]"
                disabled={isSubmitting}
                maxLength={MAX_FEEDBACK_LENGTH}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={!feedback.trim() || isSubmitting}>
                  {isSubmitting ? "Opening..." : "Open GitHub Issue Draft"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!feedback.trim() || isSubmitting}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(feedback);
                      toast({
                        title: "Copied",
                        description: "Feedback copied to clipboard.",
                      });
                    } catch {
                      toast({
                        title: "Copy failed",
                        description:
                          "Your browser blocked clipboard access. Select the text and copy manually.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Copy Feedback
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Opens:{" "}
                <a
                  className="underline underline-offset-4"
                  href={issueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {REPO_OWNER}/{REPO_NAME}
                </a>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
