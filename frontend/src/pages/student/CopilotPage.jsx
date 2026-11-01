import Navbar from "../../components/Navbar";
import CareerCopilot from "../../components/CareerCopilot";

// Full-page AI Career Copilot (general + personalized chat, with an optional job picker).
export default function CopilotPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-3xl mx-auto px-3 sm:px-6 lg:px-8 py-6">
        <CareerCopilot variant="page" />
      </div>
    </div>
  );
}
