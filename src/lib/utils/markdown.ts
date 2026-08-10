import fs from "fs";
import path from "path";

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  content: string;
  html: string;
  date: string;
  readTime: string;
  category: string;
  imageFront: string;
  imageInside: string;
}

// Maps slugs to specific categories, read times, and images for high-fidelity rendering.
const METADATA_MAP: Record<
  string,
  {
    category: string;
    categoryEn: string;
    readTime: string;
    imageFront: string;
    imageInside: string;
  }
> = {
  "best-season-timing": {
    category: "シーズン",
    categoryEn: "Season",
    readTime: "5分",
    imageFront: "/img/blog/blog_4_front.jpg",
    imageInside: "/img/blog/blog_4_inside.jpg",
  },
  "access-guide": {
    category: "アクセス",
    categoryEn: "Access",
    readTime: "4分",
    imageFront: "/img/blog/blog_6_front.jpg",
    imageInside: "/img/blog/blog_6_inside.jpg",
  },
  "gunma-activities": {
    category: "アクティビティ",
    categoryEn: "Activity",
    readTime: "5分",
    imageFront: "/img/blog/blog_2_front.jpg",
    imageInside: "/img/blog/blog_2_inside.jpg",
  },
  "recommended-guide": {
    category: "おすすめ",
    categoryEn: "Guide",
    readTime: "5分",
    imageFront: "/img/blog/blog_3_front.jpg",
    imageInside: "/img/blog/blog_3_inside.jpg",
  },
  "combo-guide": {
    category: "コンボ",
    categoryEn: "Combo",
    readTime: "6分",
    imageFront: "/img/blog/blog_5_front.jpg",
    imageInside: "/img/blog/blog_5_inside.jpg",
  },
  "oana-base-safety": {
    category: "安全対策",
    categoryEn: "Safety",
    readTime: "4分",
    imageFront: "/img/blog/blog_1_front.jpg",
    imageInside: "/img/blog/blog_1_inside.jpg",
  },
};

const BLOGS_DIR = path.join(process.cwd(), "seo-content/ja-blogs");

/**
 * Parses markdown inline styles (bold, links).
 */
function parseInline(text: string): string {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold (**text**)
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Links ([text](url))
  html = html.replace(
    /\[(.*?)\]\((.*?)\)/g,
    '<a href="$2" class="text-teal-600 hover:underline font-semibold">$1</a>'
  );

  return html;
}

/**
 * A robust custom Markdown parser to translate MD headings, lists, paragraphs, and CTAs to clean semantic HTML.
 */
function parseMarkdownToHtml(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const result: string[] = [];
  let inList = false;
  let inOrderedList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip frontmatter/meta description lines
    if (line.startsWith("# description:") || line.startsWith("description:")) {
      continue;
    }

    // Horizontal Rule
    if (line === "---") {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      if (inOrderedList) {
        result.push("</ol>");
        inOrderedList = false;
      }
      result.push('<hr class="border-stone-200 my-8" />');
      continue;
    }

    // Headings
    if (line.startsWith("# ")) {
      // H1 is usually handled by page title, skip or render
      continue;
    }
    if (line.startsWith("## ")) {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      if (inOrderedList) {
        result.push("</ol>");
        inOrderedList = false;
      }
      const title = line.replace("## ", "").trim();
      result.push(`<h2 class="text-2xl font-bold text-stone-900 mt-10 mb-4">${parseInline(title)}</h2>`);
      continue;
    }
    if (line.startsWith("### ")) {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      if (inOrderedList) {
        result.push("</ol>");
        inOrderedList = false;
      }
      const title = line.replace("### ", "").trim();
      result.push(`<h3 class="text-xl font-bold text-stone-900 mt-6 mb-3">${parseInline(title)}</h3>`);
      continue;
    }

    // Unordered Lists
    if (line.startsWith("* ") || line.startsWith("- ")) {
      if (inOrderedList) {
        result.push("</ol>");
        inOrderedList = false;
      }
      if (!inList) {
        result.push('<ul class="list-disc pl-6 space-y-2 my-4 text-stone-700">');
        inList = true;
      }
      const itemText = line.replace(/^[\*\-]\s+/, "").trim();
      result.push(`<li>${parseInline(itemText)}</li>`);
      continue;
    }

    // Ordered Lists
    if (/^\d+\.\s+/.test(line)) {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      if (!inOrderedList) {
        result.push('<ol class="list-decimal pl-6 space-y-2 my-4 text-stone-700">');
        inOrderedList = true;
      }
      const itemText = line.replace(/^\d+\.\s+/, "").trim();
      result.push(`<li>${parseInline(itemText)}</li>`);
      continue;
    }

    // Close open lists for empty lines/paragraphs
    if (line === "") {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      if (inOrderedList) {
        result.push("</ol>");
        inOrderedList = false;
      }
      continue;
    }

    // CTA / Booking Link Styling
    if (line.startsWith("[") && line.endsWith("]")) {
      const match = line.match(/^\[(.*?)\]\((.*?)\)$/);
      if (match) {
        // Special button CTA style
        const btnText = match[1];
        const btnUrl = match[2];
        result.push(`
          <div class="my-8 text-center">
            <a href="${btnUrl}" id="blog-body-cta" class="inline-flex items-center justify-center gap-2 font-bold rounded-xl px-8 py-4 text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl" style="background: var(--color-teal-600)">
              ${btnText}
            </a>
          </div>
        `);
        continue;
      }
    }

    // Default Paragraph
    if (inList) {
      result.push("</ul>");
      inList = false;
    }
    if (inOrderedList) {
      result.push("</ol>");
      inOrderedList = false;
    }
    result.push(`<p class="mb-5 leading-relaxed text-stone-700">${parseInline(line)}</p>`);
  }

  // Close lists at the end if still open
  if (inList) result.push("</ul>");
  if (inOrderedList) result.push("</ol>");

  return result.join("\n");
}

/**
 * Reads and parses a single markdown blog post file.
 */
export function getPostFromFile(filename: string): BlogPost | null {
  try {
    const slug = filename.replace(/\.md$/, "");
    const filePath = path.join(BLOGS_DIR, filename);
    const content = fs.readFileSync(filePath, "utf-8");

    // Extract description from frontmatter/meta description comment
    const descMatch = content.match(/(?:# description:|[Dd]escription:)\s*(.*)/);
    const description = descMatch ? descMatch[1].trim() : "";

    // Extract title (first single # heading)
    const lines = content.split("\n");
    let title = "";
    for (const line of lines) {
      if (line.startsWith("# ") && !line.startsWith("# description:")) {
        title = line.replace("# ", "").trim();
        break;
      }
    }

    const html = parseMarkdownToHtml(content);

    // Get metadata from maps
    const meta = METADATA_MAP[slug] || {
      category: "アドベンチャー",
      categoryEn: "Adventure",
      readTime: "5分",
      imageFront: "/img/blog/blog_1_front.jpg",
      imageInside: "/img/blog/blog_1_inside.jpg",
    };

    // Use a fixed simulated date to match GSC baseline setup
    const date = "2026年6月22日";

    return {
      slug,
      title: title || slug,
      description,
      content,
      html,
      date,
      readTime: meta.readTime,
      category: meta.category,
      imageFront: meta.imageFront,
      imageInside: meta.imageInside,
    };
  } catch (error) {
    console.error(`Error parsing markdown file ${filename}:`, error);
    return null;
  }
}

/**
 * Returns all parsed blog posts.
 */
export function getBlogPosts(): BlogPost[] {
  try {
    if (!fs.existsSync(BLOGS_DIR)) {
      return [];
    }
    const files = fs.readdirSync(BLOGS_DIR).filter((f) => f.endsWith(".md"));
    const posts = files
      .map((f) => getPostFromFile(f))
      .filter((p): p is BlogPost => p !== null);

    // Maintain a consistent deterministic order (based on METADATA_MAP keys)
    const order = Object.keys(METADATA_MAP);
    posts.sort((a, b) => {
      const idxA = order.indexOf(a.slug);
      const idxB = order.indexOf(b.slug);
      return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
    });

    return posts;
  } catch (e) {
    console.error("Error reading blog directory:", e);
    return [];
  }
}

/**
 * Returns a blog post matching the slug.
 */
export function getBlogPostBySlug(slug: string): BlogPost | null {
  return getPostFromFile(`${slug}.md`);
}
