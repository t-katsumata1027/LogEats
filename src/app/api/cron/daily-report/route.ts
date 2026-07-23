import {
  createDailyReportHandler,
  defaultDailyReportDependencies,
} from "@/lib/daily-report-handler";

export const dynamic = "force-dynamic";

export const GET = createDailyReportHandler(
  defaultDailyReportDependencies,
);
