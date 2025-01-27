import { Separator } from "@/components/ui/separator";
import { CLUSTERING_HELP_TEXT } from "@/lib/constants/clustering";

interface HelpContentProps {
  isSettings: boolean;
}

export function HelpContent({ isSettings }: HelpContentProps) {
  const content = isSettings
    ? CLUSTERING_HELP_TEXT.settings
    : CLUSTERING_HELP_TEXT.filters;

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium">{content.title}</h4>
        <p className="text-sm text-muted-foreground mt-1.5">
          {content.description}
        </p>
      </div>

      {isSettings ? (
        <>
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {CLUSTERING_HELP_TEXT.settings.kmeans.title}
            </p>
            <p className="text-sm text-muted-foreground">
              {CLUSTERING_HELP_TEXT.settings.kmeans.description}
            </p>
          </div>
          <Separator />
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {CLUSTERING_HELP_TEXT.settings.hierarchical.title}
            </p>
            <p className="text-sm text-muted-foreground">
              {CLUSTERING_HELP_TEXT.settings.hierarchical.description}
            </p>
          </div>
          <Separator />
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {CLUSTERING_HELP_TEXT.settings.pca.title}
            </p>
            <p className="text-sm text-muted-foreground">
              {CLUSTERING_HELP_TEXT.settings.pca.description}
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {CLUSTERING_HELP_TEXT.filters.stars.title}
            </p>
            <p className="text-sm text-muted-foreground">
              {CLUSTERING_HELP_TEXT.filters.stars.description}
            </p>
          </div>
          <Separator />
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {CLUSTERING_HELP_TEXT.filters.languages.title}
            </p>
            <p className="text-sm text-muted-foreground">
              {CLUSTERING_HELP_TEXT.filters.languages.description}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
