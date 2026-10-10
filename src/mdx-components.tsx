import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import { Callout, FollowUp, FollowUps, Requirements, Step, Steps, TLDR } from "@/components/content/Blocks";
import { CodeBlock, CodeTabs, Pre } from "@/components/content/CodeBlock";
import { Quiz } from "@/components/content/Quiz";
import { BarChart } from "@/components/charts/BarChart";
import { LineChart } from "@/components/charts/LineChart";
import { StatTiles } from "@/components/charts/ChartBits";
import { FlowDiagram } from "@/components/diagram/FlowDiagram";
import { SequenceDiagram } from "@/components/diagram/SequenceDiagram";
import { ClassDiagram } from "@/components/diagram/ClassDiagram";
import { DecisionTree } from "@/components/diagram/DecisionTree";
import { Timeline } from "@/components/diagram/Timeline";
import * as Widgets from "@/components/widgets";

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
  table: (props) => (
    <div className="table-wrap">
      <table {...props} />
    </div>
  ),
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
  SequenceDiagram,
  ClassDiagram,
  DecisionTree,
  Timeline,
  ...Widgets,
} satisfies MDXComponents;

export function useMDXComponents(): MDXComponents {
  return components;
}
