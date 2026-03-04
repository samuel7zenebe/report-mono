import { Hono } from "hono";
import Excel from "exceljs";
import path from "node:path";
import { db } from "../db";
import {
  account as accountTable,
  commit as commitTable,
  type Commit,
} from "../db/schema";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import {
  format,
  startOfMonth,
  endOfMonth,
  addDays,
  isWithinInterval,
  startOfDay,
  endOfDay,
} from "date-fns";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { generateText } from "ai";
import { googleAi } from "../lib/instances";

import { auth } from "../lib/auth";

export const excelRouter = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

// --- Composable Types ---
interface DateRange {
  start: Date;
  end: Date;
}

interface WeekSlot {
  start: Date;
  end: Date;
  label: string;
}

// --- Composable Functions ---

/**
 * Fetches commits from the database for a specific date range
 */
const fetchCommitsByRange = async (range: DateRange): Promise<Commit[]> => {
  return await db
    .select()
    .from(commitTable)
    .where(
      and(
        gte(commitTable.date, range.start.toISOString()),
        lte(commitTable.date, range.end.toISOString()),
      ),
    )
    .orderBy(desc(commitTable.date));
};

/**
 * Generates technical week slots for the report timeline
 */
const calculateTimelineWeeks = (range: DateRange): WeekSlot[] => {
  const weeks: WeekSlot[] = [];
  let currentStart = range.start;
  let weekNum = 1;

  while (currentStart <= range.end) {
    let currentEnd = addDays(currentStart, 6);
    if (currentEnd > range.end) currentEnd = range.end;

    weeks.push({
      start: startOfDay(currentStart),
      end: endOfDay(currentEnd),
      label: `WK 0${weekNum}`,
    });

    currentStart = addDays(currentEnd, 1);
    weekNum++;
  }
  return weeks;
};

/**
 * Uses AI to generate a technical summary for a repository group
 * Stricly enforces bullet points for every single achievement sentence.
 */
const getAiTechnicalSummary = async (
  repoName: string,
  commits: Commit[],
): Promise<string> => {
  const allSummaries = commits.map((c) => c.summary).join(". ");
  const aiPrompt = `Act as a Senior Software Architect. Analyze the following commit logs for the repository "${repoName}".
  Generate a professional summary of the technical achievements.
  
  CRITICAL RULES:
  1. EVERY SINGLE sentence must be its own bullet point starting with its own "• ".
  2. Use technical, professional language.
  3. No paragraphs. ONLY bullet points.
  4. Each bullet should be a single clear statement of fact or contribution.
  5. Just a very descriptive short sentence use word Strength not number of words.
  Logs: ${allSummaries}`;

  try {
    const { text } = await generateText({
      model: googleAi("gemini-1.5-flash"),
      prompt: aiPrompt,
    });

    // Ensure every line starts with a bullet if AI missed any
    return text
      .trim()
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => (line.startsWith("•") ? line : `• ${line}`))
      .join("\n");
  } catch (e) {
    console.error(`AI Summary Error for ${repoName}:`, e);
    return commits
      .slice(0, 8)
      .map((c) => `• ${c.summary}`)
      .join("\n");
  }
};

/**
 * Groups commits by repository name
 */
const groupCommitsByRepo = (commits: Commit[]): Record<string, Commit[]> => {
  const groups: Record<string, Commit[]> = {};
  commits.forEach((commit) => {
    const name = commit.repositoryName || "General";
    if (!groups[name]) groups[name] = [];
    groups[name].push(commit);
  });
  return groups;
};

/**
 * Main composition: loads template and populates it with processed data
 * Applies "Mesmerizing" professional styles
 */
const buildActivityReport = async (
  range: DateRange,
  commits: Commit[],
): Promise<Excel.Workbook> => {
  const templatePath = path.resolve(
    process.cwd(),
    "server/month-template.xlsx",
  );
  const workbook = new Excel.Workbook();
  await workbook.xlsx.readFile(templatePath);
  const sheet = workbook.worksheets[0];

  if (!sheet) throw new Error("Template sheet not found");

  const weeks = calculateTimelineWeeks(range);
  const repoGroups = groupCommitsByRepo(commits);

  // --- 1. Top Header Styling (Row 27) ---
  const dateLabel =
    format(range.start, "MMMM d") === format(range.end, "MMMM d")
      ? format(range.start, "MMMM yyyy").toUpperCase()
      : `${format(range.start, "MMMM d")} — ${format(range.end, "MMMM d, yyyy")}`.toUpperCase();

  const titleCell = sheet.getCell("C27");
  titleCell.value = `TECHNICAL ACTIVITY REPORT: ${dateLabel}`;
  titleCell.font = {
    bold: true,
    size: 16,
    color: { argb: "FF1E293B" },
    name: "Calibri",
  };
  sheet.getRow(27).height = 40;
  titleCell.alignment = { vertical: "middle", horizontal: "left" };

  // --- 2. Table Header Styling (Row 28) ---
  const headerRow = sheet.getRow(28);
  headerRow.height = 35;

  // Static Column Headers
  const colC = headerRow.getCell(3);
  colC.value = "REPOSITORY / SCOPE";
  const colD = headerRow.getCell(4);
  colD.value = "TECHNICAL ACHIEVEMENTS & KEY CONTRIBUTIONS";

  [colC, colD].forEach((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F172A" },
    }; // Deep Navy/Slate
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "medium" },
      left: { style: "thin" },
      bottom: { style: "medium" },
      right: { style: "thin" },
    };
  });

  // Dynamic Week Headers
  weeks.forEach((week, index) => {
    const cell = headerRow.getCell(5 + index);
    cell.value = week.label;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF334155" },
    }; // Slate Gray
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "medium" },
      left: { style: "thin" },
      bottom: { style: "medium" },
      right: { style: "thin" },
    };
    sheet.getColumn(5 + index).width = 12;
  });

  // --- 3. Data Population & Mesmerizing Styling ---
  let currentRowNum = 29;
  for (const [repoName, repoCommits] of Object.entries(repoGroups)) {
    const row = sheet.getRow(currentRowNum);

    // Repo Name (Column C)
    const repoCell = row.getCell(3);
    repoCell.value = repoName.toUpperCase();
    repoCell.font = { bold: true, size: 10, color: { argb: "FF334155" } };
    repoCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: currentRowNum % 2 === 0 ? "FFF8FAFC" : "FFFFFFFF" },
    };
    repoCell.alignment = { vertical: "top", horizontal: "left", indent: 1 };
    repoCell.border = {
      left: { style: "medium", color: { argb: "FF0F172A" } },
      right: { style: "thin" },
      top: { style: "thin" },
      bottom: { style: "thin" },
    };

    // AI Bullet Points (Column D)
    const summaryCell = row.getCell(4);
    summaryCell.value = await getAiTechnicalSummary(repoName, repoCommits);
    summaryCell.font = { size: 10, color: { argb: "FF475569" } };
    summaryCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: currentRowNum % 2 === 0 ? "FFF8FAFC" : "FFFFFFFF" },
    };
    summaryCell.alignment = {
      wrapText: true,
      vertical: "top",
      indent: 1,
    };
    summaryCell.border = {
      left: { style: "thin" },
      right: { style: "thin" },
      top: { style: "thin" },
      bottom: { style: "thin" },
    };

    // Timeline Shading (Column E+)
    weeks.forEach((week, index) => {
      const weekCell = row.getCell(5 + index);
      const hasActivity = repoCommits.some((c) =>
        isWithinInterval(new Date(c.date), {
          start: week.start,
          end: week.end,
        }),
      );

      weekCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: hasActivity
            ? "FF0F172A"
            : currentRowNum % 2 === 0
              ? "FFF8FAFC"
              : "FFFFFFFF",
        },
      };

      // If active, make the text (if any) white
      if (hasActivity) {
        weekCell.font = { color: { argb: "FFFFFFFF" } };
      }

      weekCell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Add a medium border to the end of each row
    row.getCell(5 + weeks.length - 1).border = {
      ...row.getCell(5 + weeks.length - 1).border,
      right: { style: "medium", color: { argb: "FF0F172A" } },
    };

    // Dynamic Height Calculation (Extra breathing room)
    const lineCount = summaryCell.value?.toString().split("\n").length || 1;
    row.height = Math.max(50, lineCount * 18 + 20);

    currentRowNum++;
  }

  // Final Bottom Border for the whole table
  const finalRow = sheet.getRow(currentRowNum - 1);
  for (let i = 3; i < 5 + weeks.length; i++) {
    const cell = finalRow.getCell(i);
    cell.border = {
      ...cell.border,
      bottom: { style: "medium", color: { argb: "FF0F172A" } },
    };
  }

  return workbook;
};

// --- Routes ---

const ExportSummariesSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
});

excelRouter.get(
  "/preview",
  zValidator("query", ExportSummariesSchema),
  async (c) => {
    try {
      const { start, end } = c.req.valid("query");

      const range: DateRange = {
        start: start ? startOfDay(new Date(start)) : startOfMonth(new Date()),
        end: end ? endOfDay(new Date(end)) : endOfMonth(new Date()),
      };

      const commits = await fetchCommitsByRange(range);
      const repoGroups = groupCommitsByRepo(commits);

      // Generate AI technical summaries for each repository
      const previewData = await Promise.all(
        Object.entries(repoGroups).map(async ([repoName, repoCommits]) => {
          const summary = await getAiTechnicalSummary(repoName, repoCommits);
          return {
            repository: repoName,
            summary,
            commitCount: repoCommits.length,
          };
        }),
      );

      return c.json({
        start: range.start.toISOString(),
        end: range.end.toISOString(),
        data: previewData,
      });
    } catch (err) {
      console.error("Preview Error:", err);
      return c.json({ error: "Failed to generate preview" }, 500);
    }
  },
);

// Endpoint to export Excel with custom summaries (edited by user)
excelRouter.post(
  "/export-with-custom-summaries",
  zValidator(
    "json",
    z.object({
      start: z.string().optional(),
      end: z.string().optional(),
      summaries: z.array(
        z.object({
          repository: z.string(),
          summary: z.string(),
        }),
      ),
    }),
  ),
  async (c) => {
    try {
      const { start, end, summaries } = c.req.valid("json");

      const range: DateRange = {
        start: start ? startOfDay(new Date(start)) : startOfMonth(new Date()),
        end: end ? endOfDay(new Date(end)) : endOfMonth(new Date()),
      };

      const commits = await fetchCommitsByRange(range);
      const weeks = calculateTimelineWeeks(range);

      const templatePath = path.resolve(
        process.cwd(),
        "server/month-template.xlsx",
      );
      const workbook = new Excel.Workbook();
      await workbook.xlsx.readFile(templatePath);
      const sheet = workbook.worksheets[0];

      if (!sheet) throw new Error("Template sheet not found");

      // --- 1. Top Header Styling (Row 27) ---
      const dateLabel =
        format(range.start, "MMMM d") === format(range.end, "MMMM d")
          ? format(range.start, "MMMM yyyy").toUpperCase()
          : `${format(range.start, "MMMM d")} — ${format(range.end, "MMMM d, yyyy")}`.toUpperCase();

      const titleCell = sheet.getCell("C27");
      titleCell.value = `TECHNICAL ACTIVITY REPORT: ${dateLabel}`;
      titleCell.font = {
        bold: true,
        size: 16,
        color: { argb: "FF1E293B" },
        name: "Calibri",
      };
      sheet.getRow(27).height = 40;
      titleCell.alignment = { vertical: "middle", horizontal: "left" };

      // --- 2. Table Header Styling (Row 28) ---
      const headerRow = sheet.getRow(28);
      headerRow.height = 35;

      const colC = headerRow.getCell(3);
      colC.value = "REPOSITORY / SCOPE";
      const colD = headerRow.getCell(4);
      colD.value = "TECHNICAL ACHIEVEMENTS & KEY CONTRIBUTIONS";

      [colC, colD].forEach((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF0F172A" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "medium" },
          left: { style: "thin" },
          bottom: { style: "medium" },
          right: { style: "thin" },
        };
      });

      // Dynamic Week Headers
      weeks.forEach((week, index) => {
        const cell = headerRow.getCell(5 + index);
        cell.value = week.label;
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF334155" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "medium" },
          left: { style: "thin" },
          bottom: { style: "medium" },
          right: { style: "thin" },
        };
        sheet.getColumn(5 + index).width = 12;
      });

      // --- 3. Data Population with Custom Summaries ---
      let currentRowNum = 29;
      const repoGroups = groupCommitsByRepo(commits);

      for (const [repoName, repoCommits] of Object.entries(repoGroups)) {
        const row = sheet.getRow(currentRowNum);

        // Find custom summary or use AI-generated one
        const customSummary = summaries.find(
          (s) => s.repository.toLowerCase() === repoName.toLowerCase(),
        );

        // Repo Name (Column C)
        const repoCell = row.getCell(3);
        repoCell.value = repoName.toUpperCase();
        repoCell.font = { bold: true, size: 10, color: { argb: "FF334155" } };
        repoCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: currentRowNum % 2 === 0 ? "FFF8FAFC" : "FFFFFFFF" },
        };
        repoCell.alignment = { vertical: "top", horizontal: "left", indent: 1 };
        repoCell.border = {
          left: { style: "medium", color: { argb: "FF0F172A" } },
          right: { style: "thin" },
          top: { style: "thin" },
          bottom: { style: "thin" },
        };

        // Summary (Column D) - use custom if provided
        const summaryCell = row.getCell(4);
        summaryCell.value = customSummary
          ? customSummary.summary
          : await getAiTechnicalSummary(repoName, repoCommits);
        summaryCell.font = { size: 10, color: { argb: "FF475569" } };
        summaryCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: currentRowNum % 2 === 0 ? "FFF8FAFC" : "FFFFFFFF" },
        };
        summaryCell.alignment = {
          wrapText: true,
          vertical: "top",
          indent: 1,
        };
        summaryCell.border = {
          left: { style: "thin" },
          right: { style: "thin" },
          top: { style: "thin" },
          bottom: { style: "thin" },
        };

        // Timeline Shading (Column E+)
        weeks.forEach((week, index) => {
          const weekCell = row.getCell(5 + index);
          const hasActivity = repoCommits.some((c) =>
            isWithinInterval(new Date(c.date), {
              start: week.start,
              end: week.end,
            }),
          );

          weekCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
              argb: hasActivity
                ? "FF0F172A"
                : currentRowNum % 2 === 0
                  ? "FFF8FAFC"
                  : "FFFFFFFF",
            },
          };

          if (hasActivity) {
            weekCell.font = { color: { argb: "FFFFFFFF" } };
          }

          weekCell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });

        row.getCell(5 + weeks.length - 1).border = {
          ...row.getCell(5 + weeks.length - 1).border,
          right: { style: "medium", color: { argb: "FF0F172A" } },
        };

        const lineCount = summaryCell.value?.toString().split("\n").length || 1;
        row.height = Math.max(50, lineCount * 18 + 20);

        currentRowNum++;
      }

      const finalRow = sheet.getRow(currentRowNum - 1);
      for (let i = 3; i < 5 + weeks.length; i++) {
        const cell = finalRow.getCell(i);
        cell.border = {
          ...cell.border,
          bottom: { style: "medium", color: { argb: "FF0F172A" } },
        };
      }

      const buffer = await workbook.xlsx.writeBuffer();

      return c.body(buffer, 200, {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Premium_Technical_Report_${format(range.start, "yyyy-MM")}.xlsx"`,
      });
    } catch (err) {
      console.error("Excel Export Error:", err);
      return c.json({ error: "Failed to generate report" }, 500);
    }
  },
);

excelRouter.get(
  "/export-monthly-summaries",
  zValidator("query", ExportSummariesSchema),
  async (c) => {
    try {
      const { start, end } = c.req.valid("query");

      const range: DateRange = {
        start: start ? startOfDay(new Date(start)) : startOfMonth(new Date()),
        end: end ? endOfDay(new Date(end)) : endOfMonth(new Date()),
      };

      const commits = await fetchCommitsByRange(range);
      const workbook = await buildActivityReport(range, commits);

      const buffer = await workbook.xlsx.writeBuffer();

      return c.body(buffer, 200, {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Premium_Technical_Report_${format(range.start, "yyyy-MM")}.xlsx"`,
      });
    } catch (err) {
      console.error("Excel Export Error:", err);
      return c.json({ error: "Failed to generate report" }, 500);
    }
  },
);

excelRouter.get("/excell", async (c) => {
  const range: DateRange = {
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  };

  const data = await fetchCommitsByRange(range);

  return c.json({
    message: "Excel data fetched successfully",
    ...range,
    data,
  });
});

/**
 * NEW: Export and Save to OneDrive
 */
excelRouter.get(
  "/save-to-onedrive",
  zValidator("query", ExportSummariesSchema),
  async (c) => {
    try {
      // 1. Check Auth (populated by middleware in app.ts)
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized: Please sign in first" }, 401);
      }

      const { start, end } = c.req.valid("query");
      const range: DateRange = {
        start: start ? startOfDay(new Date(start)) : startOfMonth(new Date()),
        end: end ? endOfDay(new Date(end)) : endOfMonth(new Date()),
      };

      // 2. Fetch Microsoft Access Token for the current user
      const dbAccount = await db
        .select()
        .from(accountTable)
        .where(
          and(
            eq(accountTable.userId, user.id as string),
            eq(accountTable.providerId, "microsoft"),
          ),
        )
        .limit(1);

      const accessToken = dbAccount[0]?.accessToken;
      if (!accessToken) {
        return c.json(
          { error: "Microsoft account not linked or token missing" },
          400,
        );
      }

      // 3. Generate the Premium Report
      const commits = await fetchCommitsByRange(range);
      const workbook = await buildActivityReport(range, commits);
      const buffer = await workbook.xlsx.writeBuffer();

      // 4. Upload to Microsoft Graph
      const filename = `Technical_Report_${format(range.start, "yyyy-MM-dd")}.xlsx`;
      const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/DevMono_Reports/${filename}:/content`;

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
        body: buffer,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        console.error("OneDrive Upload Failed:", errorData);
        return c.json(
          { error: "Failed to upload to OneDrive", details: errorData },
          500,
        );
      }

      const driveItem = (await uploadResponse.json()) as { webUrl: string };

      return c.json({
        success: true,
        message: "Report successfully saved to OneDrive",
        path: `/DevMono_Reports/${filename}`,
        webUrl: driveItem.webUrl,
      });
    } catch (err) {
      console.error("OneDrive Integration Error:", err);
      return c.json({ error: "Failed to process OneDrive request" }, 500);
    }
  },
);
