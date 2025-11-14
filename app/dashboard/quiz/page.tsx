"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import PaginationBar from "@/app/dashboard/_components/Pagination";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, FileText, Edit, Plus } from "lucide-react";

type Question = {
  question_id?: number | string;
  question?: string;
  answer?: unknown | null;
  page_number?: number;
  subquestions?: Question[];
  [k: string]: any;
};

type NormalizedQuestion = {
  question_id?: string | number;
  question?: string;
  answer?: any;
  type?: string | null;
  options?: string[] | null;
  subquestions?: NormalizedQuestion[];
  [k: string]: any;
};

type QuestionnaireRow = {
  id: string;
  questions: string | object | null;
  created_at: string | null;
  page_number?: number | null;
};

export default function QuestionnairesPage() {
  const [rows, setRows] = useState<QuestionnaireRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);

  const [selected, setSelected] = useState<QuestionnaireRow | null>(null);
  const [viewOpen, setViewOpen] = useState<boolean>(false);
  const [editingOpen, setEditingOpen] = useState<boolean>(false);
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  const [pageFilter, setPageFilter] = useState<number | "all">("all");

  const mountedRef = useRef(true);

  const [formQuestions, setFormQuestions] = useState<NormalizedQuestion[]>(
    []
  );
  const [formPageNumber, setFormPageNumber] = useState<number>(1);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const debugLog = (label: string, obj: any) => {
      try {
        console.debug(label, JSON.stringify(obj, null, 2));
      } catch (e) {
        console.debug(label, obj);
      }
    };

    const fetchList = async () => {
      setLoading(true);
      try {
        let q: any = supabaseBrowser
          .from("questionnaires")
          .select("id, questions, created_at, page_number", { count: "exact" })
          .order("page_number", { ascending: true })
          .order("created_at", { ascending: false });

        const from = (page - 1) * limit;
        const to = from + limit - 1;
        q = q.range(from, to);

        let usedServerFilter = false;
        if (searchTerm.trim()) {
          const term = `%${searchTerm.trim()}%`;
          try {
            q = q.ilike("questions", term);
            usedServerFilter = true;
          } catch (e) {
            console.warn(
              "Server-side ilike not usable; will filter client-side",
              e
            );
          }
        }

        const resp = await q;
        debugLog("supabase response (fetchList)", resp);

        const data = (resp as any)?.data ?? resp;
        const error = (resp as any)?.error ?? null;
        const count = (resp as any)?.count ?? null;

        if (error) {
          if (searchTerm.trim()) {
            const fallbackResp = await supabaseBrowser
              .from("questionnaires")
              .select("id, questions, created_at, page_number", {
                count: "exact",
              })
              .order("page_number", { ascending: true })
              .order("created_at", { ascending: false })
              .range(from, to);

            const fallbackData = (fallbackResp as any)?.data ?? [];
            const termLower = searchTerm.trim().toLowerCase();
            const filtered = (fallbackData as any[]).filter((row) => {
              try {
                return JSON.stringify(row.questions ?? "")
                  .toLowerCase()
                  .includes(termLower);
              } catch {
                return false;
              }
            });

            if (!cancelled && mountedRef.current) {
              setRows(filtered as QuestionnaireRow[]);
              setTotal(
                typeof fallbackResp.count === "number"
                  ? fallbackResp.count
                  : filtered.length
              );
            }
            return;
          }

          setRows([]);
          setTotal(0);

          const errMessage =
            error?.message || error?.details || JSON.stringify(error);
          console.error("Supabase query error:", error);
          showToast({
            type: "error",
            title: "Load failed",
            description:
              errMessage.length > 120
                ? errMessage.slice(0, 120) + "…"
                : errMessage,
          });

          if (error?.status === 401 || error?.status === 403) {
            console.warn(
              "This looks like an auth/RLS error. Check your Supabase policies and JWT role."
            );
          }
          return;
        }

        if (!cancelled && mountedRef.current) {
          if (!usedServerFilter && searchTerm.trim()) {
            const termLower = searchTerm.trim().toLowerCase();
            const raw = Array.isArray(data) ? (data as any[]) : [];
            const filtered = raw.filter((row) => {
              try {
                return JSON.stringify(row.questions ?? "")
                  .toLowerCase()
                  .includes(termLower);
              } catch {
                return false;
              }
            });
            setRows(filtered as QuestionnaireRow[]);
            setTotal(typeof count === "number" ? count : filtered.length);
          } else {
            setRows(Array.isArray(data) ? (data as QuestionnaireRow[]) : []);
            setTotal(
              typeof count === "number"
                ? count
                : Array.isArray(data)
                ? data.length
                : 0
            );
          }
        }
      } catch (err: any) {
        console.error("fetch questionnaires error (unexpected)", err);
        showToast({
          type: "error",
          title: "Load failed",
          description: err?.message
            ? String(err.message)
            : "Unexpected error while loading questionnaires",
        });
        setRows([]);
        setTotal(0);
      } finally {
        if (!cancelled && mountedRef.current) setLoading(false);
      }
    };

    fetchList();
    return () => {
      cancelled = true;
    };
  }, [page, limit, searchTerm]);

  const fetchNow = async (): Promise<void> => {
    setLoading(true);
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let q: any = supabaseBrowser
        .from("questionnaires")
        .select("id, questions, created_at, page_number", { count: "exact" })
        .order("page_number", { ascending: true })
        .order("created_at", { ascending: false })
        .range(from, to);

      let usedServerFilter = false;
      if (searchTerm.trim()) {
        const term = `%${searchTerm.trim()}%`;
        try {
          q = q.ilike("questions", term);
          usedServerFilter = true;
        } catch (e) {
          console.warn(
            "Server-side ilike not usable in fetchNow; will do client-side filter",
            e
          );
        }
      }

      const resp = await q;
      try {
        console.debug(
          "supabase response (fetchNow)",
          JSON.stringify(resp, null, 2)
        );
      } catch {
        console.debug("supabase response (fetchNow)", resp);
      }

      const data = (resp as any)?.data ?? resp;
      const error = (resp as any)?.error ?? null;
      const count = (resp as any)?.count ?? null;

      if (error) {
        if (searchTerm.trim()) {
          const fallbackResp = await supabaseBrowser
            .from("questionnaires")
            .select("id, questions, created_at, page_number", {
              count: "exact",
            })
            .order("page_number", { ascending: true })
            .order("created_at", { ascending: false })
            .range(from, to);

          const fallbackData = (fallbackResp as any)?.data ?? [];
          const termLower = searchTerm.trim().toLowerCase();
          const filtered = (fallbackData as any[]).filter((row) => {
            try {
              return JSON.stringify(row.questions ?? "")
                .toLowerCase()
                .includes(termLower);
            } catch {
              return false;
            }
          });

          setRows(filtered as QuestionnaireRow[]);
          setTotal(
            typeof fallbackResp.count === "number"
              ? fallbackResp.count
              : filtered.length
          );
          setLoading(false);
          return;
        }

        console.error("fetchNow supabase error:", error);
        showToast({
          type: "error",
          title: "Load failed",
          description: error?.message ?? "Could not load questionnaires",
        });
        setRows([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      if (!usedServerFilter && searchTerm.trim()) {
        const termLower = searchTerm.trim().toLowerCase();
        const raw = Array.isArray(data) ? (data as any[]) : [];
        const filtered = raw.filter((row) => {
          try {
            return JSON.stringify(row.questions ?? "")
              .toLowerCase()
              .includes(termLower);
          } catch {
            return false;
          }
        });
        setRows(filtered as QuestionnaireRow[]);
        setTotal(typeof count === "number" ? count : filtered.length);
      } else {
        setRows(Array.isArray(data) ? (data as QuestionnaireRow[]) : []);
        setTotal(
          typeof count === "number"
            ? count
            : Array.isArray(data)
            ? data.length
            : 0
        );
      }
    } catch (err: any) {
      console.error("fetchNow err", err);
      showToast({
        type: "error",
        title: "Load failed",
        description: err?.message ?? "Could not load questionnaires",
      });
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setPage(1);
    setSearchTerm("");
    setPageFilter("all");
    await fetchNow();
  };

  function openCreate() {
    setSelected(null);
    setFormQuestions([]);
    setFormPageNumber(1);
    setEditingOpen(true);
  }

  function openEdit(row: QuestionnaireRow) {
    setSelected(row);
    const parsed =
      typeof row.questions === "string"
        ? (() => {
            try {
              return JSON.parse(row.questions);
            } catch {
              return [];
            }
          })()
        : row.questions && typeof row.questions === "object"
        ? Array.isArray((row.questions as any).questions)
          ? (row.questions as any).questions
          : Array.isArray(row.questions)
          ? (row.questions as any)
          : []
        : [];

    setFormQuestions(
      Array.isArray(parsed)
        ? parsed.map((q: any) => ({
            question_id:
              q.question_id ?? q.id ?? q.questionId ?? Math.random().toString(),
            question: q.question ?? q.text ?? "",
            answer: q.answer ?? q.value ?? "",
            type: q.type ?? null,
            options: Array.isArray(q.options) ? q.options : null,
            subquestions: Array.isArray(q.subquestions)
              ? q.subquestions.map((sq: any) => ({
                  question_id: sq.question_id ?? sq.id ?? Math.random().toString(),
                  question: sq.question ?? sq.text ?? "",
                  answer: sq.answer ?? sq.value ?? "",
                  type: sq.type ?? null,
                  options: Array.isArray(sq.options) ? sq.options : null,
                }))
              : undefined,
            ...q,
          }))
        : []
    );
    setFormPageNumber(typeof row.page_number === "number" ? row.page_number : 1);
    setEditingOpen(true);
  }

  function openView(row: QuestionnaireRow) {
    setSelected(row);
    setViewOpen(true);
  }

  async function saveQuestionnaire() {
    setSaving(true);
    try {
      const toSaveQuestions = Array.isArray(formQuestions) ? formQuestions : [];

      const payload = {
        questions: toSaveQuestions,
        page_number:
          typeof formPageNumber === "number" && !Number.isNaN(formPageNumber)
            ? formPageNumber
            : 1,
      };

      if (selected) {
        const createdAtValue = selected.created_at ?? new Date().toISOString();
        const { error } = await supabaseBrowser
          .from("questionnaires")
          .update({
            ...payload,
            created_at: createdAtValue,
          })
          .eq("id", selected.id);
        if (error) throw error;
        showToast({ title: "Updated", description: "Questionnaire updated." });
      } else {
        const { error } = await supabaseBrowser
          .from("questionnaires")
          .insert([{ ...payload, created_at: new Date().toISOString() }]);
        if (error) throw error;
        showToast({ title: "Created", description: "Questionnaire created." });
      }
      setEditingOpen(false);
      setSelected(null);
      setFormQuestions([]);
      setFormPageNumber(1);
      setPage(1);
      await fetchNow();
    } catch (err: any) {
      console.error("saveQuestionnaire err", err);
      showToast({
        type: "error",
        title: "Save failed",
        description: err?.message ? String(err.message) : "Could not save questionnaire.",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(row: QuestionnaireRow) {
    setSelected(row);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!selected) return;
    setDeleting(true);
    try {
      const { error } = await supabaseBrowser
        .from("questionnaires")
        .delete()
        .eq("id", selected.id);
      if (error) throw error;
      showToast({ title: "Deleted", description: "Questionnaire removed." });
      setDeleteOpen(false);
      setSelected(null);
      const remainingOnPage = rows.length - 1;
      if (remainingOnPage <= 0 && page > 1) setPage((p) => p - 1);
      await fetchNow();
    } catch (err) {
      console.error("delete err", err);
      showToast({
        type: "error",
        title: "Delete failed",
        description: "Could not delete questionnaire.",
      });
    } finally {
      setDeleting(false);
    }
  }

  const parseQuestions = (
    questionsInput: string | object | null
  ): NormalizedQuestion[] => {
    if (!questionsInput) return [];
    try {
      const parsed =
        typeof questionsInput === "string"
          ? JSON.parse(questionsInput)
          : (questionsInput as any);

      if (Array.isArray(parsed)) {
        return parsed.map((it: any) => ({
          question_id: it.question_id ?? it.id ?? it.questionId ?? undefined,
          question: it.question ?? it.text ?? undefined,
          answer: it.answer ?? it.value ?? undefined,
          type: it.type ?? null,
          options: Array.isArray(it.options) ? it.options : null,
          subquestions: Array.isArray(it.subquestions)
            ? it.subquestions.map((sq: any) => ({
                question_id: sq.question_id ?? sq.id,
                question: sq.question ?? sq.text,
                answer: sq.answer ?? sq.value ?? undefined,
                type: sq.type ?? null,
                options: Array.isArray(sq.options) ? sq.options : null,
              }))
            : undefined,
          ...it,
        })) as NormalizedQuestion[];
      }

      if (
        parsed &&
        typeof parsed === "object" &&
        Array.isArray((parsed as any).questions)
      ) {
        return (parsed as any).questions.map((q: any) => ({
          question_id: q.id ?? q.question_id,
          question: q.text ?? q.question ?? undefined,
          answer: q.answer ?? q.value ?? undefined,
          type: q.type ?? null,
          options: Array.isArray(q.options) ? q.options : null,
          subquestions: Array.isArray(q.subquestions)
            ? q.subquestions.map((sq: any) => ({
                question_id: sq.id ?? sq.question_id,
                question: sq.text ?? sq.question,
                answer: sq.answer ?? sq.value ?? undefined,
                type: sq.type ?? null,
                options: Array.isArray(sq.options) ? sq.options : null,
              }))
            : undefined,
          ...q,
        })) as NormalizedQuestion[];
      }

      return [];
    } catch {
      return [];
    }
  };

  const firstQuestionText = (questionsInput: string | object | null) => {
    const arr = parseQuestions(questionsInput);
    if (!Array.isArray(arr) || arr.length === 0) return "No questions";
    const first = arr[0];
    if (first?.question) return String(first.question);
    if (first?.type) return `(${first.type})`;
    if (first?.question_id) return `Question ${first.question_id}`;
    return "No question text";
  };

  const pageOptions = useMemo(() => {
    const setPages = new Set<number>();
    for (const r of rows) {
      if (typeof r.page_number === "number" && !Number.isNaN(r.page_number)) {
        setPages.add(r.page_number);
      }
    }
    return Array.from(setPages).sort((a, b) => a - b);
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (pageFilter === "all") return rows;
    return rows.filter((r) =>
      typeof r.page_number === "number" ? r.page_number === pageFilter : false
    );
  }, [rows, pageFilter]);

  const skeletonRows = Array.from({ length: Math.min(limit, 6) }).map(
    (_, i) => (
      <TableRow key={`skeleton-${i}`}>
        <TableCell className="py-6">
          <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
        </TableCell>
        <TableCell>
          <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
        </TableCell>
        <TableCell>
          <div className="h-4 bg-gray-200 rounded w-full max-w-lg animate-pulse" />
        </TableCell>
        <TableCell>
          <div className="h-4 bg-gray-200 rounded w-36 animate-pulse" />
        </TableCell>
      </TableRow>
    )
  );

  const body = useMemo(() => {
    if (loading) return skeletonRows;

    if (!filteredRows || filteredRows.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="text-center py-8 text-gray-500">
            No data.
          </TableCell>
        </TableRow>
      );
    }

    return filteredRows.map((r) => {
      const uid = r.id;
      return (
        <TableRow key={r.id} data-id={r.id}>
          <TableCell className="w-24 text-sm text-gray-700">
            {typeof r.page_number === "number" ? r.page_number : 1}
          </TableCell>

          <TableCell className="max-w-[60ch] whitespace-pre-wrap">
            <div className="font-medium">{firstQuestionText(r.questions)}</div>
            <div className="text-xs text-gray-500 mt-1">
              {r.created_at
                ? format(
                    typeof r.created_at === "string"
                      ? parseISO(r.created_at)
                      : new Date(r.created_at),
                    "dd MMM yyyy"
                  )
                : "-"}
            </div>
          </TableCell>

          <TableCell className="text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => openView(r)}
                title="View"
                className="border-0"
              >
                <FileText className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => openEdit(r)}
                title="Edit"
                className="border-0"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(r)}
                title="Delete"
                className="border-0"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      );
    });
  }, [filteredRows, loading, page, limit, rows, formQuestions]);

  function renderQuestionsPreview(questionsInput: string | object | null) {
    if (!questionsInput)
      return <div className="text-sm text-gray-600">No questions.</div>;

    let parsedTop: any = null;
    try {
      parsedTop =
        typeof questionsInput === "string"
          ? JSON.parse(questionsInput)
          : questionsInput;
    } catch {
      parsedTop = null;
    }

    const normalized = parseQuestions(questionsInput);
    if (!normalized || normalized.length === 0)
      return <div className="text-sm text-gray-600">No questions.</div>;

    return (
      <div>
        {parsedTop && typeof parsedTop === "object" && parsedTop.title && (
          <div className="text-sm text-gray-700 font-semibold mb-2">
            {parsedTop.title}
          </div>
        )}

        <ol className="list-decimal pl-6 space-y-3">
          {normalized.map((q) => (
            <li key={String(q.question_id ?? Math.random())}>
              <div className="font-medium">
                {q.question ?? "(No question text)"}
              </div>

              {q.type && (
                <div className="text-xs text-gray-500 mt-1">Type: {q.type}</div>
              )}

              {q.options &&
                Array.isArray(q.options) &&
                q.options.length > 0 && (
                  <div className="text-xs text-gray-600 mt-1">
                    Options: <span className="text-xs">{q.options.join(", ")}</span>
                  </div>
                )}

              {q.subquestions && q.subquestions.length > 0 && (
                <ul className="pl-4 list-disc mt-2">
                  {q.subquestions.map((sq) => (
                    <li
                      key={String(sq.question_id ?? Math.random())}
                      className="text-sm text-gray-700"
                    >
                      {sq.question ?? "(No text)"}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const addQuestionField = () => {
    setFormQuestions((s) => [
      ...s,
      {
        question_id: `q-${Date.now()}`,
        question: "",
        answer: "",
        type: "text",
        options: null,
      },
    ]);
  };
  const updateQuestionField = (index: number, patch: Partial<NormalizedQuestion>) => {
    setFormQuestions((s) => {
      const copy = s.slice();
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };
  const removeQuestionField = (index: number) => {
    setFormQuestions((s) => s.filter((_, i) => i !== index));
  };

  const addOptionToQuestion = (index: number) => {
    setFormQuestions((s) => {
      const copy = s.slice();
      const q = { ...copy[index] } as NormalizedQuestion;
      q.options = Array.isArray(q.options) ? [...q.options, ""] : [""];
      copy[index] = q;
      return copy;
    });
  };
  const updateOptionForQuestion = (qIndex: number, optIndex: number, value: string) => {
    setFormQuestions((s) => {
      const copy = s.slice();
      const q = { ...copy[qIndex] } as NormalizedQuestion;
      q.options = (q.options || []).slice();
      q.options[optIndex] = value;
      copy[qIndex] = q;
      return copy;
    });
  };
  const removeOptionFromQuestion = (qIndex: number, optIndex: number) => {
    setFormQuestions((s) => {
      const copy = s.slice();
      const q = { ...copy[qIndex] } as NormalizedQuestion;
      q.options = (q.options || []).slice();
      q.options.splice(optIndex, 1);
      if (q.options.length === 0) q.options = null;
      copy[qIndex] = q;
      return copy;
    });
  };

  const renderAnswerEditor = (q: NormalizedQuestion, idx: number) => {
    const type = q.type || "text";
    if (Array.isArray(q.options) && q.options.length > 0) {
      if (type === "checkbox") {
        const selected: string[] = Array.isArray(q.answer) ? q.answer : [];
        return (
          <div className="flex flex-wrap gap-2 mt-2">
            {q.options.map((opt, i) => (
              <label key={i} className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={(e) => {
                    const next = new Set(selected);
                    if (e.target.checked) next.add(opt);
                    else next.delete(opt);
                    updateQuestionField(idx, { answer: Array.from(next) });
                  }}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        );
      }

      return (
        <select
          value={q.answer === undefined || q.answer === null ? "" : String(q.answer)}
          onChange={(e) => updateQuestionField(idx, { answer: e.target.value })}
          className="w-full border border-gray-200 p-2 rounded mt-2"
        >
          <option value="">Select...</option>
          {q.options.map((opt, i) => (
            <option value={opt} key={i}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    return (
      <Input
        value={q.answer === null || typeof q.answer === "undefined" ? "" : String(q.answer)}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          updateQuestionField(idx, { answer: e.target.value })
        }
        className="mt-2"
      />
    );
  };

  return (
    <div className="p-6 relative">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 w-[100%]">
          <Input
            placeholder="Search questions..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead style={{ width: 80 }}>Page</TableHead>
            <TableHead>Question</TableHead>
            <TableHead style={{ width: 160 }}>Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>{body}</TableBody>
      </Table>

      <div className="mt-4">
        <PaginationBar
          page={page}
          setPage={setPage}
          totalPage={totalPages}
          totalRecord={total}
          limit={limit}
          setLimit={setLimit}
        />
      </div>

      <button
        onClick={openCreate}
        aria-label="Add questionnaire"
        className="fixed right-6 bottom-6 z-50 inline-flex items-center justify-center rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white w-14 h-14"
        title="Add questionnaire"
      >
        <Plus className="w-6 h-6" />
      </button>

      <Dialog
        open={viewOpen}
        onOpenChange={(o) => {
          if (!o) setViewOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle>View questionnaire</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="pt-3">
              {renderQuestionsPreview(selected?.questions ?? null)}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (selected) {
                  openEdit(selected);
                  setViewOpen(false);
                }
              }}
              className="bg-blue-600 text-white"
            >
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingOpen}
        onOpenChange={(o) => {
          if (!o) {
            setEditingOpen(false);
            setSelected(null);
            setFormQuestions([]);
            setFormPageNumber(1);
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl bg-white">
          <DialogHeader>
            <DialogTitle>
              {selected ? `Edit questionnaire` : "New questionnaire"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Page number
              </label>
              <input
                type="number"
                min={1}
                value={formPageNumber}
                onChange={(e) => setFormPageNumber(Number(e.target.value))}
                className="w-28 border border-gray-200 p-2 rounded text-sm"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium mb-1">Questions</label>
                <div>
                  <Button size="sm" onClick={addQuestionField} className="mr-2">
                    Add question
                  </Button>
                </div>
              </div>

              {formQuestions.length === 0 && (
                <div className="text-sm text-gray-500 mb-2">No questions added yet.</div>
              )}

              <div className="space-y-3">
                {formQuestions.map((q, idx) => (
                  <div key={String(q.question_id ?? idx)} className=" rounded p-3 border border-gray-100">
                    <div className="flex items-center ">
                      <div className="w-[80%]">
                        <label className="text-xs text-gray-600">Question</label>
                        <Input
                          value={q.question ?? ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updateQuestionField(idx, { question: e.target.value })
                          }
                          className="mt-1"
                        />
                      </div>

                      <div className="ml-4 w-44">
                        <label className="text-xs text-gray-600">Type</label>
                        <select
                          value={q.type || "text"}
                          onChange={(e) =>
                            updateQuestionField(idx, {
                              type: e.target.value,
                              options:
                                ["select", "radio", "checkbox", "yes_no"].includes(e.target.value) && !q.options
                                  ? e.target.value === "yes_no"
                                    ? ["Yes", "No"]
                                    : [""]
                                  : q.options ?? null,
                              answer:
                                e.target.value === "checkbox"
                                  ? Array.isArray(q.answer)
                                    ? q.answer
                                    : []
                                  : typeof q.answer === "string"
                                  ? q.answer
                                  : "",
                            })
                          }
                          className="w-full border border-gray-200 p-2 rounded mt-1"
                        >
                          <option value="text">Text</option>
                          <option value="select">Select</option>
                          <option value="radio">Radio</option>
                          <option value="checkbox">Checkbox (multi)</option>
                          <option value="yes_no">Yes / No</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="text-xs text-gray-600">Answer</label>
                      <div>{renderAnswerEditor(q, idx)}</div>
                    </div>

                    {["select", "radio", "checkbox", "yes_no"].includes(q.type || "") && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600 mb-1">Options</div>
                          <div>
                            <Button size="sm" onClick={() => addOptionToQuestion(idx)}>
                              Add option
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2 mt-2">
                          {(q.options || []).map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <Input
                                value={opt}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  updateOptionForQuestion(idx, optIdx, e.target.value)
                                }
                              />
                              <Button size="sm" variant="destructive" onClick={() => removeOptionFromQuestion(idx, optIdx)}>
                                Remove
                              </Button>
                            </div>
                          ))}
                          {(q.options || []).length === 0 && (
                            <div className="text-xs text-gray-500">No options yet — add one above.</div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end mt-3 gap-2">
                      <Button size="sm" variant="outline" onClick={() => removeQuestionField(idx)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditingOpen(false);
                setSelected(null);
                setFormQuestions([]);
                setFormPageNumber(1);
              }}
              disabled={saving}
              className="bg-red-700 text-white"
            >
              Cancel
            </Button>
            <Button onClick={saveQuestionnaire} disabled={saving} className="bg-blue-700 text-white">
              {saving ? "Saving…" : selected ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(o) => {
          if (!o) setDeleteOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle>Delete questionnaire?</DialogTitle>
          </DialogHeader>

          <div className="py-2">
            <p className="text-sm text-gray-600">
              This action cannot be undone.
            </p>
          </div>

          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-600 text-white"
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
