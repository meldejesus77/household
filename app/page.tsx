import Link from "next/link";

const features = [
  {
    href: "/jo-schedule",
    title: "Jo Schedule",
    description: "Build a day schedule for Jo — pick activities by category, set durations, and print a clean time-block schedule.",
    color: "bg-purple-50 border-purple-200 hover:bg-purple-100",
    icon: "📅",
  },
  {
    href: "/packing",
    title: "Packing",
    description: "Manage packing lists for trips and outings.",
    color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
    icon: "🧳",
  },
  {
    href: "/budget",
    title: "Budget",
    description: "Track household income, expenses, and monthly budgets.",
    color: "bg-green-50 border-green-200 hover:bg-green-100",
    icon: "💰",
  },
  {
    href: "/retirement",
    title: "Retirement",
    description: "Project retirement savings and run what-if scenarios.",
    color: "bg-yellow-50 border-yellow-200 hover:bg-yellow-100",
    icon: "📈",
  },
  {
    href: "/todo",
    title: "Todo",
    description: "Shared household to-do list for tasks and projects.",
    color: "bg-orange-50 border-orange-200 hover:bg-orange-100",
    icon: "✅",
  },
  {
    href: "/calendar",
    title: "Calendar",
    description: "Year-at-a-glance list of family events and holidays. Add single dates or ranges.",
    color: "bg-indigo-50 border-indigo-200 hover:bg-indigo-100",
    icon: "📆",
  },
  {
    href: "/lists",
    title: "Lists",
    description: "Grocery lists, wishlists, and any other running lists.",
    color: "bg-pink-50 border-pink-200 hover:bg-pink-100",
    icon: "📝",
  },
  {
    href: "/health",
    title: "Health",
    description: "Log health events for Mel, Kathy, and Jo. Track symptoms, exercise, mood, and more.",
    color: "bg-red-50 border-red-200 hover:bg-red-100",
    icon: "🩺",
  },
];

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Household</h1>
      <p className="text-gray-500 mb-8">Family tools and planners in one place.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className={`border rounded-xl p-5 transition-colors ${f.color}`}
          >
            <div className="text-2xl mb-2">{f.icon}</div>
            <h2 className="font-semibold text-gray-900 text-lg mb-1">{f.title}</h2>
            <p className="text-gray-600 text-sm">{f.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
