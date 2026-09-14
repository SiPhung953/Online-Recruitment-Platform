import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import { PasswordHasher } from "../src/utils/PasswordHasher";
import { RoleConstant } from "../src/api-shared/constant/RoleConstant";

/**
 * Demo data.
 *
 * Every row carries a fixed uuid and is written with `upsert`, so running this
 * repeatedly converges on the same state instead of stacking duplicates. It
 * only ever touches its own ids — rows created by hand through the app are left
 * exactly as they are.
 *
 * The job titles deliberately overlap in places ("Backend Engineer" vs "Backend
 * Developer Intern", three different Engineer roles) so the recommender has
 * something to separate; a set of wholly unrelated titles would make any
 * ranking look good.
 *
 * Run with: pnpm --filter api seed
 */

const SEED_PASSWORD = "Password123!";

// `Company.ownerEmployerId` is unique — one company per employer — so three
// companies need three employer accounts.
const EMPLOYERS = [
  {
    id: "5eed0000-0000-4000-a000-000000000001",
    email: "hr@fptsoftware.demo",
    company: {
      id: "5eed0000-0000-4000-b000-000000000001",
      name: "FPT Software",
      city: "Ho Chi Minh City",
      district: "District 9",
      description:
        "One of Vietnam's largest software outsourcing companies, delivering engineering services to clients across Japan, Europe and North America.",
    },
  },
  {
    id: "5eed0000-0000-4000-a000-000000000002",
    email: "talent@vnglab.demo",
    company: {
      id: "5eed0000-0000-4000-b000-000000000002",
      name: "VNG Lab",
      city: "Ho Chi Minh City",
      district: "District 7",
      description:
        "The research arm of a Vietnamese internet company, working on recommendation systems, distributed storage and large-scale messaging.",
    },
  },
  {
    id: "5eed0000-0000-4000-a000-000000000003",
    email: "careers@hanoidata.demo",
    company: {
      id: "5eed0000-0000-4000-b000-000000000003",
      name: "Hanoi Data Collective",
      city: "Hanoi",
      district: "Cau Giay",
      description:
        "A data consultancy building analytics platforms and machine learning pipelines for logistics and retail clients in northern Vietnam.",
    },
  },
] as const;

type EmploymentType = "ON_SITE" | "REMOTE" | "HYBRID";

interface SeedJob {
  id: string;
  companyIndex: 0 | 1 | 2;
  title: string;
  employmentType: EmploymentType;
  location: string;
  description: string;
  requirement: string;
}

const JOBS: SeedJob[] = [
  {
    id: "5eed0000-0000-4000-c000-000000000001",
    companyIndex: 0,
    title: "Backend Engineer",
    employmentType: "ON_SITE",
    location: "Ho Chi Minh City",
    description:
      "Build and operate the services behind our client platforms. You will design REST APIs, model relational data, and take features from specification through to production.",
    requirement:
      "Comfortable with TypeScript or Java.\nUnderstands relational databases and can write non-trivial SQL.\nHas shipped at least one HTTP API to production.",
  },
  {
    id: "5eed0000-0000-4000-c000-000000000002",
    companyIndex: 0,
    title: "Backend Developer Intern",
    employmentType: "HYBRID",
    location: "Ho Chi Minh City",
    description:
      "A six-month internship on the platform team. You will pair with senior engineers, pick up review feedback quickly, and own small features end to end.",
    requirement:
      "Final-year student in Computer Science or a related field.\nFamiliar with one backend language.\nCan read English technical documentation.",
  },
  {
    id: "5eed0000-0000-4000-c000-000000000003",
    companyIndex: 0,
    title: "Frontend Engineer",
    employmentType: "HYBRID",
    location: "Ho Chi Minh City",
    description:
      "Own the interfaces our clients use every day. You will work in React and TypeScript, care about accessibility, and turn design files into maintainable components.",
    requirement:
      "Strong React and TypeScript.\nUnderstands browser rendering and state management.\nAn eye for layout and spacing.",
  },
  {
    id: "5eed0000-0000-4000-c000-000000000004",
    companyIndex: 0,
    title: "Quality Assurance Engineer",
    employmentType: "ON_SITE",
    location: "Da Nang",
    description:
      "Design and run the test strategy for a large outsourcing project, covering manual exploratory testing and an automated regression suite.",
    requirement:
      "Experience writing test plans.\nFamiliar with at least one automation framework.\nMethodical about reproduction steps.",
  },
  {
    id: "5eed0000-0000-4000-c000-000000000005",
    companyIndex: 1,
    title: "Machine Learning Engineer",
    employmentType: "ON_SITE",
    location: "Ho Chi Minh City",
    description:
      "Work on the recommendation models that decide what tens of millions of users see. You will run offline experiments, ship models to production, and measure their effect.",
    requirement:
      "Solid grounding in statistics and linear algebra.\nPython, with PyTorch or TensorFlow.\nHas evaluated a model against a held-out set and can explain the result.",
  },
  {
    id: "5eed0000-0000-4000-c000-000000000006",
    companyIndex: 1,
    title: "Data Analyst",
    employmentType: "HYBRID",
    location: "Ho Chi Minh City",
    description:
      "Turn product and business questions into queries, dashboards and short written answers that other teams can act on.",
    requirement:
      "Fluent SQL, including window functions.\nOne of Python or R for analysis.\nCan write a clear paragraph explaining a chart.",
  },
  {
    id: "5eed0000-0000-4000-c000-000000000007",
    companyIndex: 1,
    title: "Site Reliability Engineer",
    employmentType: "REMOTE",
    location: "Remote (Vietnam)",
    description:
      "Keep a high-traffic platform available. You will automate away toil, improve observability, and take part in an on-call rotation.",
    requirement:
      "Comfortable on Linux and with containers.\nUnderstands networking fundamentals.\nWrites code to replace manual work.",
  },
  {
    id: "5eed0000-0000-4000-c000-000000000008",
    companyIndex: 1,
    title: "Research Intern, Recommendation Systems",
    employmentType: "ON_SITE",
    location: "Ho Chi Minh City",
    description:
      "Join the lab for a research internship on ranking and retrieval. You will read recent literature, reproduce a baseline, and propose one improvement.",
    requirement:
      "Graduate student, or final-year undergraduate with research experience.\nComfortable reading papers in English.\nPython.",
  },
  {
    id: "5eed0000-0000-4000-c000-000000000009",
    companyIndex: 2,
    title: "Data Engineer",
    employmentType: "HYBRID",
    location: "Hanoi",
    description:
      "Build the pipelines that move client data from source systems into a warehouse other teams can trust, and keep them running.",
    requirement:
      "SQL and Python.\nHas worked with a scheduler such as Airflow.\nUnderstands why idempotent jobs matter.",
  },
  {
    id: "5eed0000-0000-4000-c000-00000000000a",
    companyIndex: 2,
    title: "Junior Data Analyst",
    employmentType: "ON_SITE",
    location: "Hanoi",
    description:
      "A first analytics role. You will start with reporting and ad-hoc queries, then grow into owning a subject area for one of our logistics clients.",
    requirement:
      "Recent graduate in any quantitative subject.\nBasic SQL and spreadsheets.\nWilling to ask questions.",
  },
  {
    id: "5eed0000-0000-4000-c000-00000000000b",
    companyIndex: 2,
    title: "Full Stack Engineer",
    employmentType: "REMOTE",
    location: "Remote (Vietnam)",
    description:
      "Work across the stack on internal analytics tooling, from the Postgres schema through the API to the React dashboard.",
    requirement:
      "TypeScript on both sides of the wire.\nComfortable designing a schema.\nCan work without close supervision.",
  },
  {
    id: "5eed0000-0000-4000-c000-00000000000c",
    companyIndex: 2,
    title: "Business Analyst",
    employmentType: "HYBRID",
    location: "Hanoi",
    description:
      "Sit between the client and the engineering team: gather requirements, write them down unambiguously, and keep scope honest.",
    requirement:
      "Excellent written Vietnamese and English.\nHas written a requirements document before.\nComfortable challenging a request.",
  },
];

/** Far enough out that the expiry sweep will never touch the demo data. */
function farFutureDeadline(): Date {
  const deadline = new Date();
  deadline.setFullYear(deadline.getFullYear() + 2);
  return deadline;
}

async function main() {
  const passwordHash = await new PasswordHasher().hash(SEED_PASSWORD);
  const deadline = farFutureDeadline();

  // 1. Roles have to exist before any user can reference one.
  for (const [name, id] of Object.entries(RoleConstant)) {
    if (typeof id !== "number") continue;
    await prisma.role.upsert({
      where: { id },
      update: {},
      create: { id, name },
    });
  }

  // 2. Employers and their companies.
  for (const employer of EMPLOYERS) {
    await prisma.user.upsert({
      where: { id: employer.id },
      update: {},
      create: {
        id: employer.id,
        email: employer.email,
        passwordHash,
        roleId: RoleConstant.EMPLOYER,
        status: "ACTIVE",
      },
    });

    await prisma.company.upsert({
      where: { id: employer.company.id },
      update: {
        name: employer.company.name,
        city: employer.company.city,
        district: employer.company.district,
        description: employer.company.description,
      },
      create: {
        id: employer.company.id,
        ownerEmployerId: employer.id,
        name: employer.company.name,
        city: employer.company.city,
        district: employer.company.district,
        description: employer.company.description,
      },
    });
  }

  // 3. The job postings, all approved and open.
  for (const job of JOBS) {
    const employer = EMPLOYERS[job.companyIndex];

    await prisma.job.upsert({
      where: { id: job.id },
      update: {
        title: job.title,
        description: job.description,
        requirement: job.requirement,
        employmentType: job.employmentType,
        location: job.location,
        status: "ACTIVE",
        deadline,
      },
      create: {
        id: job.id,
        createdByEmployerId: employer.id,
        companyId: employer.company.id,
        title: job.title,
        description: job.description,
        requirement: job.requirement,
        employmentType: job.employmentType,
        location: job.location,
        status: "ACTIVE",
        deadline,
        approvedAt: new Date(),
      },
    });
  }

  console.log(
    `Seeded ${EMPLOYERS.length} employers, ${EMPLOYERS.length} companies and ${JOBS.length} active job postings.`
  );
  console.log(`Seeded accounts share the password: ${SEED_PASSWORD}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
