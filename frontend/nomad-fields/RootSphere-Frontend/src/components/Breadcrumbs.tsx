import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const navigate = useNavigate();

  return (
    <nav className="flex items-center gap-1 text-sm overflow-x-auto pb-1 scrollbar-hide">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <div key={index} className="flex items-center gap-1 shrink-0">
            {item.path ? (
              <button
                onClick={() => navigate(item.path)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </button>
            ) : (
              <span className={isLast ? "text-foreground font-medium" : "text-muted-foreground"}>
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          </div>
        );
      })}
    </nav>
  );
}
