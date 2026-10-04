import { BuiltForEvents } from "@/components/landing/built-for-events";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Infrastructure } from "@/components/landing/infrastructure";
import { ProblemSolution } from "@/components/landing/problem-solution";
import { SiteFooter } from "@/components/landing/site-footer";

export default function Home() {
  return (
    <>
      <main className="flex-1">
        <Hero />
        <ProblemSolution />
        <HowItWorks />
        <BuiltForEvents />
        <Infrastructure />
      </main>
      <SiteFooter />
    </>
  );
}
