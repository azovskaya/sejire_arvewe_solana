import { useEffect, useState } from "react";
import { Welcome } from "./components/Welcome";
import { Workspace } from "./components/Workspace";
import { RestoreSeed } from "./components/RestoreSeed";
import { AdminDesk } from "./components/AdminDesk";
import { closeOpsHash, isOpsHash, openOpsHash } from "./lib/opsDesk/route";
import type { TreeStore } from "./lib/types";
import { clearDraftTree, loadDraftTree, saveDraftTree } from "./lib/draftStorage";
import { coerceTreeStore } from "./lib/treeJson";
import {
  clearGuide,
  defaultGuide,
  loadGuide,
  saveGuide,
  startGuidedTree,
  type GuideState,
} from "./lib/guide";
import { clearVaultSession } from "./lib/vaultSession/session";
import {
  readLastScreen,
  rememberScreen,
  shouldResumeDraft,
} from "./lib/lastScreen";

type Screen = "welcome" | "work" | "restore" | "admin";

function bootApp(): { screen: Screen; store: TreeStore | null; guide: GuideState } {
  if (typeof location !== "undefined" && isOpsHash(location.hash)) {
    return { screen: "admin", store: null, guide: defaultGuide() };
  }
  const draft = loadDraftTree();
  if (shouldResumeDraft(readLastScreen(), Boolean(draft)) && draft) {
    return {
      screen: "work",
      store: draft,
      guide: loadGuide() ?? { ...defaultGuide(), step: "done" },
    };
  }
  return { screen: "welcome", store: null, guide: defaultGuide() };
}

export default function App() {
  const [boot] = useState(bootApp);
  const [screen, setScreen] = useState<Screen>(boot.screen);
  const [store, setStore] = useState<TreeStore | null>(boot.store);
  const [guide, setGuide] = useState<GuideState>(boot.guide);

  function go(next: Screen) {
    if (next === "admin") {
      openOpsHash();
      setScreen("admin");
      return;
    }
    if (screen === "admin") closeOpsHash();
    rememberScreen(next === "work" || next === "welcome" || next === "restore" ? next : "welcome");
    setScreen(next);
  }

  useEffect(() => {
    function onHash() {
      if (isOpsHash(location.hash)) setScreen("admin");
      else if (screen === "admin") setScreen("welcome");
    }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [screen]);

  function startNew(title: string) {
    clearDraftTree();
    clearGuide();
    clearVaultSession();
    const started = startGuidedTree(title);
    saveDraftTree(started.store);
    saveGuide(started.guide);
    setStore(started.store);
    setGuide(started.guide);
    go("work");
  }

  function continueDraft(opened?: TreeStore | null) {
    const draft = coerceTreeStore(opened) ?? loadDraftTree();
    if (!draft) return;
    saveDraftTree(draft);
    setStore(draft);
    setGuide(loadGuide() ?? { ...defaultGuide(), step: "done" });
    go("work");
  }

  return (
    <div className={screen === "work" ? "app-shell is-work" : "app-shell"}>
      {screen === "welcome" && (
        <Welcome
          onStartNew={startNew}
          onContinueDraft={continueDraft}
          onRestoreSeed={() => go("restore")}
          onCashier={() => go("admin")}
        />
      )}

      {screen === "admin" && <AdminDesk onHome={() => go("welcome")} />}

      {screen === "restore" && (
        <RestoreSeed
          onBack={() => go("welcome")}
          onRestored={(opened) => continueDraft(opened)}
        />
      )}

      {screen === "work" && store && (
        <Workspace
          store={store}
          guide={guide}
          onStoreChange={(next) => {
            setStore((prev) => {
              if (!prev) return prev;
              const candidate = typeof next === "function" ? next(prev) : next;
              return coerceTreeStore(candidate) ?? prev;
            });
          }}
          onGuideChange={setGuide}
          onHome={() => go("welcome")}
        />
      )}
    </div>
  );
}
