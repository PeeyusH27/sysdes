import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import { Callout, FollowUp, FollowUps, Requirements, Step, Steps, TLDR } from "@/components/content/Blocks";
import { LessonSection } from "@/components/content/LessonSection";
import { CodeBlock, CodeTabs, Pre } from "@/components/content/CodeBlock";
import { Quiz } from "@/components/content/Quiz";
import { TableWrap } from "@/components/content/TableWrap";
import { BarChart } from "@/components/charts/BarChart";
import { LineChart } from "@/components/charts/LineChart";
import { StatTiles } from "@/components/charts/ChartBits";
import { FlowDiagram } from "@/components/diagram/FlowDiagram";
import { SequenceDiagram } from "@/components/diagram/SequenceDiagram";
import { ClassDiagram } from "@/components/diagram/ClassDiagram";
import { DecisionTree } from "@/components/diagram/DecisionTree";
import { Timeline } from "@/components/diagram/Timeline";
import * as Widgets from "@/components/widgets";
import { AlgoViz } from "@/components/algo/AlgoViz";
import { JsRef, ProblemLink } from "@/components/dsa/ContentBits";
import { RunCode } from "@/components/dsa/RunCode";
import { Doodle } from "@/components/doodle/Doodle";
import { Term } from "@/components/content/Term";
import { ReachFor } from "@/components/content/ReachFor";

const components = {
  a: ({ href = "", children, ...rest }) =>
    href.startsWith("/") || href.startsWith("#") ? (
      <Link href={href} {...rest}>
        {children}
      </Link>
    ) : (
      <a href={href} target="_blank" rel="noreferrer" {...rest}>
        {children}
      </a>
    ),
  // Becomes a focusable region only when it overflows the reading column.
  table: (props) => <TableWrap {...props} />,
  pre: Pre as MDXComponents["pre"],
  // GFM task lists render disabled checkboxes: show a decorative box instead of an unlabelled control.
  input: (props) =>
    props.type === "checkbox" ? (
      <span className="task-box" aria-hidden>
        {props.checked ? "☑" : "☐"}
      </span>
    ) : (
      <input {...props} />
    ),
  // Added around every `##` section by the rehype-section-cards plugin, not written in MDX.
  LessonSection,
  TLDR,
  Callout,
  Requirements,
  Steps,
  Step,
  FollowUps,
  FollowUp,
  Quiz,
  CodeBlock,
  CodeTabs,
  StatTiles,
  BarChart,
  LineChart,
  FlowDiagram,
  Doodle,
  Term,
  ReachFor,
  SequenceDiagram,
  ClassDiagram,
  DecisionTree,
  Timeline,
  AlgoViz,
  JsRef,
  ProblemLink,
  RunCode,
  ...Widgets,
} satisfies MDXComponents;

export function useMDXComponents(): MDXComponents {
  return components;
}
