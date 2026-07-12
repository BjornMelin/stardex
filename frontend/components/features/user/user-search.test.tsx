import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchUsers } from "@/lib/github";
import { UserSearch } from "./user-search";

const { queryState, store } = vi.hoisted(() => ({
  queryState: { lastKey: undefined as string | undefined },
  store: {
    selectedUsers: [] as string[],
    addUser: vi.fn(),
    removeUser: vi.fn(),
    clearUsers: vi.fn(),
    setShouldFetchRepos: vi.fn(),
  },
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { alt, ...rest } = props as { alt?: string };
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={typeof alt === "string" ? alt : ""} {...rest} />;
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/store/github", () => ({
  useGitHubStore: () => store,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (opts: { queryKey: unknown; queryFn: () => unknown; enabled?: boolean }) => {
    if (opts.enabled) {
      const serialized = JSON.stringify(opts.queryKey);
      if (serialized !== queryState.lastKey) {
        queryState.lastKey = serialized;
        void opts.queryFn();
      }
    }
    return { data: [], isLoading: false };
  },
}));

vi.mock("@/lib/github", async () => {
  const actual = await vi.importActual<typeof import("@/lib/github")>("@/lib/github");
  return { ...actual, searchUsers: vi.fn() };
});

const mockedSearchUsers = vi.mocked(searchUsers);

beforeEach(() => {
  queryState.lastKey = undefined;
  store.selectedUsers = [];
  vi.clearAllMocks();
  mockedSearchUsers.mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("UserSearch", () => {
  it("updates the controlled input immediately (no keystroke lag)", () => {
    vi.useFakeTimers();

    render(<UserSearch />);

    fireEvent.click(screen.getByRole("combobox"));

    const input = screen.getByPlaceholderText("Search GitHub users...") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "oct" } });
    expect(input).toHaveValue("oct");

    expect(mockedSearchUsers).not.toHaveBeenCalled();
  });

  it("debounces the search query trigger (fires only after the delay with the latest value)", () => {
    vi.useFakeTimers();

    render(<UserSearch />);

    fireEvent.click(screen.getByRole("combobox"));

    const input = screen.getByPlaceholderText("Search GitHub users...") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "o" } });
    act(() => vi.advanceTimersByTime(100));
    fireEvent.change(input, { target: { value: "oc" } });
    act(() => vi.advanceTimersByTime(100));
    fireEvent.change(input, { target: { value: "oct" } });

    expect(input).toHaveValue("oct");
    expect(mockedSearchUsers).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(249));
    expect(mockedSearchUsers).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(mockedSearchUsers).toHaveBeenCalledTimes(1);
    expect(mockedSearchUsers).toHaveBeenCalledWith("oct");
  });

  it("pressing Enter triggers repository fetching when a user is selected", () => {
    store.selectedUsers = ["octocat"];

    render(<UserSearch />);

    fireEvent.click(screen.getByRole("combobox"));

    const input = screen.getByPlaceholderText("Search GitHub users...") as HTMLInputElement;
    fireEvent.keyDown(input, { key: "Enter" });

    expect(store.setShouldFetchRepos).toHaveBeenCalledWith(true);
  });

  it("the Search button triggers repository fetching without navigating", () => {
    store.selectedUsers = ["octocat"];

    render(<UserSearch />);

    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(store.setShouldFetchRepos).toHaveBeenCalledWith(true);
  });
});
