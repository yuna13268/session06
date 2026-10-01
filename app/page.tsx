"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { configError, getSupabase } from "@/lib/supabase";

type Post = { id: string; content: string; created_at: string };
const dateFormat = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

export default function Home() {
  const [content, setContent] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(!configError);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [notice, setNotice] = useState("");
  const savingRef = useRef(false);
  const requestId = useRef(0);
  const length = Array.from(content).length;

  const loadPosts = useCallback(async () => {
    if (configError) return;
    const currentRequest = ++requestId.current;
    setLoading(true);
    setLoadError("");
    try {
      // 브라우저 → Supabase API → posts 테이블. 최신 50개를 조회합니다.
      const { data, error } = await getSupabase()
        .from("posts")
        .select("id, content, created_at")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(50)
        .abortSignal(AbortSignal.timeout(15000));
      if (error) throw error;
      if (currentRequest === requestId.current) setPosts(data ?? []);
    } catch {
      if (currentRequest === requestId.current) {
        setLoadError(
          "기록을 불러오지 못했습니다. 네트워크, Supabase URL·키, posts 테이블과 SELECT 권한·RLS 정책을 확인한 뒤 다시 시도해 주세요.",
        );
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 첫 방문에도 새로 불러오기와 같은 DB 조회 함수를 사용합니다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPosts();
    return () => {
      requestId.current += 1;
    };
  }, [loadPosts]);

  async function savePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current || configError) return;
    const trimmed = content.trim();
    if (!trimmed || length > 500) {
      setSaveError("공백을 제외한 내용을 500자 이내로 입력해 주세요.");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setSaveError("");
    setNotice("");
    try {
      // DB의 기본값이 id와 created_at을 만듭니다. 내용만 전송합니다.
      const { error } = await getSupabase()
        .from("posts")
        .insert({ content: trimmed })
        .abortSignal(AbortSignal.timeout(15000));
      if (error) throw error;
      setContent("");
      setNotice("기록을 저장했습니다.");
      await loadPosts();
    } catch {
      setSaveError(
        "저장 응답을 확인하지 못했습니다. 네트워크, URL·키, INSERT 권한·RLS와 입력 조건을 확인해 주세요. 응답이 끊겼다면 저장되었을 수 있으니 목록을 새로 불러온 뒤 재시도해 주세요.",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <main className="page">
      <header className="masthead">
        <span className="brand">
          <span className="brand-mark" aria-hidden="true">
            ↗
          </span>{" "}
          하루 한 줄
        </span>
        <span className="session">SESSION 06</span>
      </header>
      <section className="intro">
        <p className="eyebrow">작은 순간도, 기록이 되니까</p>
        <h1>
          유나의 한 줄 기록!!<span className="dot">.</span>
        </h1>
        <p>오늘 배운 것, 기억에 남은 순간을 함께 나눠요.</p>
      </section>

      {configError && (
        <aside className="setup" role="status">
          <h2>Supabase 연결을 준비해 주세요</h2>
          <p>{configError}</p>
          <p>README의 4~7단계를 따라 설정하면 기록을 작성할 수 있어요.</p>
        </aside>
      )}

      <section className="composer" aria-labelledby="compose-title">
        <div className="section-top">
          <h2 id="compose-title">어떤 하루를 보냈나요?</h2>
          <span className="pill">공개 기록</span>
        </div>
        <form onSubmit={savePost}>
          <label htmlFor="content">오늘 남기고 싶은 한 줄</label>
          <textarea
            id="content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="작은 발견이나 새로운 배움을 적어 보세요."
            disabled={saving || !!configError}
            aria-describedby="privacy count"
            aria-invalid={length > 500}
            rows={5}
          />
          <div className="form-bottom">
            <span
              id="count"
              className={length > 500 ? "over-limit" : "counter"}
            >
              {length} / 500자
            </span>
            <button
              type="submit"
              disabled={
                saving || !!configError || !content.trim() || length > 500
              }
            >
              {saving ? "저장 중…" : "기록 남기기"}
              <span aria-hidden="true"> ↗</span>
            </button>
          </div>
          <p id="privacy" className="privacy">
            실습용 공개 기록입니다. 개인정보는 입력하지 마세요.
          </p>
          {saveError && (
            <p className="error" role="alert">
              {saveError}
            </p>
          )}
          <p className="notice" role="status">
            {notice}
          </p>
        </form>
      </section>

      <section
        className="feed"
        aria-labelledby="feed-title"
        aria-busy={loading}
      >
        <div className="section-top">
          <div>
            <h2 id="feed-title">함께 남긴 기록</h2>
            <p className="feed-caption">최신 50개 · 작성 시각은 한국 시간</p>
          </div>
          <button
            className="secondary"
            onClick={() => void loadPosts()}
            disabled={loading || saving || !!configError}
          >
            새로 불러오기
          </button>
        </div>
        {configError ? (
          <div className="empty">
            <p>연결 후, 첫 기록을 남겨 보세요.</p>
            <span>설정이 완료되면 이곳에 기록이 표시됩니다.</span>
          </div>
        ) : loading ? (
          <p className="empty" role="status">
            기록을 불러오는 중…
          </p>
        ) : loadError ? (
          <p className="error" role="alert">
            {loadError}
          </p>
        ) : posts.length === 0 ? (
          <div className="empty">
            <span className="empty-symbol" aria-hidden="true">
              ✎
            </span>
            <p>아직 남겨진 기록이 없어요.</p>
            <span>첫 번째 한 줄로 시작해 볼까요?</span>
          </div>
        ) : (
          <ul className="post-list">
            {posts.map((post) => (
              <li key={post.id} className="post">
                <div className="post-meta">
                  <span>한 줄 기록</span>
                  <time dateTime={post.created_at}>
                    {dateFormat.format(new Date(post.created_at))}
                  </time>
                </div>
                <p>{post.content}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <footer>
        오늘의 작은 기록이 모이는 곳<span>Next.js + Supabase</span>
      </footer>
    </main>
  );
}
