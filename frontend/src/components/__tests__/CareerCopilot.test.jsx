import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import CareerCopilot from "../CareerCopilot";
import { aiAPI, jobsAPI } from "../../api";

vi.mock("../../api", () => ({
  aiAPI: { chat: vi.fn(), studyPlan: vi.fn(), interviewQuestions: vi.fn(), suggestSkills: vi.fn() },
  jobsAPI: { getAll: vi.fn() },
}));

const reply = (text, extra = {}) => ({ data: { success: true, reply: text, conversationId: null, timestamp: new Date().toISOString(), contextUsed: [], ...extra } });
const box = () => screen.getByLabelText("Message the AI Career Copilot");
const sendBtn = () => screen.getByLabelText("Send message");
const type = (t) => fireEvent.change(box(), { target: { value: t } });
const payload = (n = 0) => aiAPI.chat.mock.calls[n][0];

beforeEach(() => {
  vi.clearAllMocks();
  jobsAPI.getAll.mockResolvedValue({ data: { jobs: [{ _id: "j1", title: "Backend Intern", company: { companyName: "TechNova" } }] } });
});

describe("welcome screen", () => {
  test("shows the greeting, six suggestion cards, and a disabled Send button", () => {
    render(<CareerCopilot />);
    expect(screen.getByText("PlaceIT AI Career Copilot")).toBeTruthy();
    expect(screen.getByText("Hi! I'm your PlaceIT Career Copilot.")).toBeTruthy();
    for (const t of ["Help me prepare for my next interview.", "Explain my job skill gaps.", "Create a personalized 7-day study plan.",
                     "Generate technical interview questions.", "Help me improve my resume.", "Explain a technical concept."]) {
      expect(screen.getByText(t)).toBeTruthy();
    }
    expect(sendBtn().disabled).toBe(true);
  });

  test("suggestion card sends its prompt; the 'concept' card only fills the box", async () => {
    aiAPI.chat.mockResolvedValue(reply("Sure"));
    render(<CareerCopilot />);
    fireEvent.click(screen.getByText("Help me improve my resume."));
    await waitFor(() => expect(aiAPI.chat).toHaveBeenCalledTimes(1));
    expect(payload().message).toBe("Help me improve my resume.");

    fireEvent.click(screen.getByText("New chat"));
    fireEvent.click(screen.getByText("Explain a technical concept."));
    expect(box().value).toBe("Explain the concept of ");
    expect(aiAPI.chat).toHaveBeenCalledTimes(1);
  });
});

describe("sending messages", () => {
  test("sends text, shows both bubbles, renders the reply as Markdown, then clears the box", async () => {
    aiAPI.chat.mockResolvedValue(reply("Java is **object-oriented**.\n\n- simple\n- portable"));
    render(<CareerCopilot />);
    type("What is Java?");
    fireEvent.click(sendBtn());
    expect(await screen.findByText("object-oriented")).toBeTruthy();
    expect(screen.getByText("What is Java?")).toBeTruthy();
    expect(payload()).toEqual({ message: "What is Java?", conversationHistory: [], jobId: null, contextMode: "general" });
    expect(box().value).toBe("");
  });

  test("Enter sends, Shift+Enter does not", async () => {
    aiAPI.chat.mockResolvedValue(reply("ok"));
    render(<CareerCopilot />);
    type("line one");
    fireEvent.keyDown(box(), { key: "Enter", shiftKey: true });
    expect(aiAPI.chat).not.toHaveBeenCalled();
    fireEvent.keyDown(box(), { key: "Enter" });
    await waitFor(() => expect(aiAPI.chat).toHaveBeenCalledTimes(1));
  });

  test("empty and whitespace-only messages are never sent", () => {
    render(<CareerCopilot />);
    type("   ");
    expect(sendBtn().disabled).toBe(true);
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(aiAPI.chat).not.toHaveBeenCalled();
  });

  test("duplicate submissions are blocked while a reply is pending", async () => {
    let resolve;
    aiAPI.chat.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<CareerCopilot />);
    type("first");
    fireEvent.keyDown(box(), { key: "Enter" });
    type("second");
    fireEvent.keyDown(box(), { key: "Enter" });
    fireEvent.click(sendBtn());
    expect(aiAPI.chat).toHaveBeenCalledTimes(1);
    expect(sendBtn().disabled).toBe(true);
    expect(screen.getByText("Thinking…")).toBeTruthy();
    await act(async () => { resolve(reply("done")); });
    expect(await screen.findByText("done")).toBeTruthy();
  });

  test("message length is capped at 2000 characters", () => {
    render(<CareerCopilot />);
    type("x".repeat(2500));
    expect(box().value.length).toBe(2000);
  });
});

describe("conversation memory", () => {
  test("follow-ups carry earlier turns in order, without the new message", async () => {
    aiAPI.chat.mockResolvedValueOnce(reply("RAG stands for Retrieval-Augmented Generation.")).mockResolvedValueOnce(reply("In PlaceIT, RAG could..."));
    render(<CareerCopilot />);
    type("What is RAG?");
    fireEvent.click(sendBtn());
    await screen.findByText(/Retrieval-Augmented/);
    type("Explain it using my PlaceIT project");
    fireEvent.click(sendBtn());
    await screen.findByText(/In PlaceIT, RAG could/);
    expect(payload(1).message).toBe("Explain it using my PlaceIT project");
    expect(payload(1).conversationHistory).toEqual([
      { role: "user", content: "What is RAG?" },
      { role: "assistant", content: "RAG stands for Retrieval-Augmented Generation." },
    ]);
  });

  test("only the most recent 10 messages are sent in a long conversation", async () => {
    aiAPI.chat.mockImplementation((p) => Promise.resolve(reply(`answer to ${p.message}`)));
    render(<CareerCopilot />);
    for (let i = 1; i <= 8; i++) {
      type(`question ${i}`);
      fireEvent.click(sendBtn());
      await screen.findByText(`answer to question ${i}`);
    }
    const h = payload(7).conversationHistory;
    expect(h.length).toBe(10);
    expect(h[0]).toEqual({ role: "user", content: "question 3" });
    expect(h[9]).toEqual({ role: "assistant", content: "answer to question 7" });
  });

  test("New chat clears everything and starts fresh (no old history)", async () => {
    aiAPI.chat.mockResolvedValue(reply("hello there"));
    render(<CareerCopilot />);
    type("hi");
    fireEvent.click(sendBtn());
    await screen.findByText("hello there");
    fireEvent.click(screen.getByText("New chat"));
    expect(screen.queryByText("hello there")).toBeNull();
    expect(screen.getByText("Hi! I'm your PlaceIT Career Copilot.")).toBeTruthy();
    type("again");
    fireEvent.click(sendBtn());
    await waitFor(() => expect(aiAPI.chat).toHaveBeenCalledTimes(2));
    expect(payload(1).conversationHistory).toEqual([]);
  });
});

describe("errors and retry", () => {
  test("shows a friendly error with Retry; retry resends once and leaves one user bubble", async () => {
    aiAPI.chat.mockRejectedValueOnce({ response: { status: 503, data: { error: "The AI assistant is temporarily unavailable." } } })
              .mockResolvedValueOnce(reply("Back online"));
    render(<CareerCopilot />);
    type("What is SQL?");
    fireEvent.click(sendBtn());
    expect(await screen.findByText("The AI assistant is temporarily unavailable.")).toBeTruthy();
    fireEvent.click(screen.getByText("Retry"));
    expect(await screen.findByText("Back online")).toBeTruthy();
    expect(screen.getAllByText("What is SQL?").length).toBe(1);
    expect(payload(1).message).toBe("What is SQL?");
    expect(payload(1).conversationHistory).toEqual([]);          // error bubble / retried message not echoed back
    expect(screen.queryByText("The AI assistant is temporarily unavailable.")).toBeNull();
  });

  test("network failure and timeout get readable messages (no stack traces)", async () => {
    aiAPI.chat.mockRejectedValueOnce(new Error("Network Error")).mockRejectedValueOnce(Object.assign(new Error("t"), { code: "ECONNABORTED" }));
    render(<CareerCopilot />);
    type("a"); fireEvent.click(sendBtn());
    expect(await screen.findByText(/Couldn't reach the server/)).toBeTruthy();
    type("b"); fireEvent.click(sendBtn());
    expect(await screen.findByText(/took too long/)).toBeTruthy();
  });

  test("a failed reply is not included in the next request's history", async () => {
    aiAPI.chat.mockRejectedValueOnce({ response: { data: { error: "Boom" } } }).mockResolvedValueOnce(reply("fine"));
    render(<CareerCopilot />);
    type("one"); fireEvent.click(sendBtn());
    await screen.findByText("Boom");
    type("two"); fireEvent.click(sendBtn());
    await screen.findByText("fine");
    expect(payload(1).conversationHistory).toEqual([{ role: "user", content: "one" }]);
  });
});

describe("personalization and job context", () => {
  test("embedded on a job page: job id is sent and Personalized is on by default", async () => {
    aiAPI.chat.mockResolvedValue(reply("You are missing Docker.", { contextUsed: ["profile", "job", "skill-gap"] }));
    render(<CareerCopilot jobId="j1" jobTitle="Backend Intern" />);
    expect(screen.getByText("Backend Intern")).toBeTruthy();
    type("Which skills am I missing for this internship?");
    fireEvent.click(sendBtn());
    await screen.findByText("You are missing Docker.");
    expect(payload()).toMatchObject({ jobId: "j1", contextMode: "personalized" });
    expect(screen.getByText(/Based on your profile, the selected job, skill match/)).toBeTruthy();
  });

  test("turning Personalized off sends general mode", async () => {
    aiAPI.chat.mockResolvedValue(reply("ok"));
    render(<CareerCopilot jobId="j1" />);
    fireEvent.click(screen.getByLabelText(/Personalized answers/));
    type("What is a stack?");
    fireEvent.click(sendBtn());
    await waitFor(() => expect(aiAPI.chat).toHaveBeenCalled());
    expect(payload().contextMode).toBe("general");
  });

  test("page mode: choosing a job from the picker sends its id", async () => {
    aiAPI.chat.mockResolvedValue(reply("ok"));
    render(<CareerCopilot variant="page" />);
    await screen.findByText("Backend Intern — TechNova");
    fireEvent.change(screen.getByLabelText("Select a job for job-specific help"), { target: { value: "j1" } });
    type("Am I eligible?");
    fireEvent.click(sendBtn());
    await waitFor(() => expect(aiAPI.chat).toHaveBeenCalled());
    expect(payload()).toMatchObject({ jobId: "j1", contextMode: "personalized" });
  });
});

describe("original one-click features still work inside the chat", () => {
  test("study plan, interview questions and resume skills buttons call the existing APIs", async () => {
    aiAPI.studyPlan.mockResolvedValue({ data: { plan: { summary: "Focus on Docker.", days: [{ day: 1, focus: "Containers", tasks: ["Install Docker"] }] } } });
    aiAPI.interviewQuestions.mockResolvedValue({ data: { questions: [{ question: "What is a container?", topic: "Docker", hint: "Isolation" }] } });
    aiAPI.suggestSkills.mockResolvedValue({ data: { suggestions: [{ name: "Python", evidence: "Built scripts in Python", alreadyInProfile: false }] } });
    render(<CareerCopilot jobId="j1" />);

    fireEvent.click(screen.getByText("7-day study plan"));
    expect(await screen.findByText("Day 1: Containers")).toBeTruthy();
    expect(aiAPI.studyPlan).toHaveBeenCalledWith("j1", 7);

    fireEvent.click(screen.getByText("14-day study plan"));
    await waitFor(() => expect(aiAPI.studyPlan).toHaveBeenCalledWith("j1", 14));

    fireEvent.click(screen.getByText("Interview questions"));
    expect(await screen.findByText("What is a container?")).toBeTruthy();
    expect(aiAPI.interviewQuestions).toHaveBeenCalledWith("j1", 5);

    fireEvent.click(screen.getByText("Skills from my resume"));
    expect(await screen.findByText("Python")).toBeTruthy();
  });

  test("a plan can be discussed afterwards: it is part of the history", async () => {
    aiAPI.studyPlan.mockResolvedValue({ data: { plan: { summary: "Focus on Docker.", days: [{ day: 1, focus: "Containers", tasks: ["Install Docker"] }] } } });
    aiAPI.chat.mockResolvedValue(reply("Sure, lighter day 1."));
    render(<CareerCopilot jobId="j1" />);
    fireEvent.click(screen.getByText("7-day study plan"));
    await screen.findByText("Day 1: Containers");
    type("Make day 1 lighter");
    fireEvent.click(sendBtn());
    await screen.findByText("Sure, lighter day 1.");
    const h = payload().conversationHistory;
    expect(h[0].role).toBe("user");
    expect(h[1].content).toContain("Day 1: Containers");
  });

  test("job-based quick actions are disabled until a job is chosen; resume skills needs no job", () => {
    render(<CareerCopilot variant="page" />);
    expect(screen.getByText("7-day study plan").disabled).toBe(true);
    expect(screen.getByText("Interview questions").disabled).toBe(true);
    expect(screen.getByText("Skills from my resume").disabled).toBe(false);
  });
});

describe("rendering model output safely in the chat", () => {
  test("links and images in a reply are inert", async () => {
    aiAPI.chat.mockResolvedValue(reply("See [site](https://phish.example) ![x](https://evil.example/p.png) <script>alert(1)</script>"));
    const { container } = render(<CareerCopilot />);
    type("hi"); fireEvent.click(sendBtn());
    await screen.findByText(/See/);
    expect(container.querySelector("a[href]")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
  });
});
