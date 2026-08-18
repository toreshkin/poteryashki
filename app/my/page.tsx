import type { Metadata } from "next";
import MyReportsView from "@/components/MyReportsView";
import { SITE_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: `Мои заявки — ${SITE_NAME}`,
};

export default function MyPage() {
  return <MyReportsView />;
}
