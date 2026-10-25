"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SectionHeader } from "./shared";
import { LESSONS, QUIZ } from "@/lib/phoneconn/data";
import { usePhoneConn } from "@/lib/phoneconn/store";
import {
  GraduationCap, BookOpen, Clock, CheckCircle2, XCircle,
  ChevronLeft, Brain, Trophy, RotateCcw, Lightbulb,
} from "lucide-react";

export function Academy() {
  const logActivity = usePhoneConn((s) => s.logActivity);
  const setQuizScore = usePhoneConn((s) => s.setQuizScore);
  const quizScore = usePhoneConn((s) => s.quizScore);
  const quizTotal = usePhoneConn((s) => s.quizTotal);

  const [lessonId, setLessonId] = useState<string>(LESSONS[0].id);
  const [quizStarted, setQuizStarted] = useState(false);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const lesson = LESSONS.find((l) => l.id === lessonId) ?? LESSONS[0];

  function startQuiz() {
    setQuizStarted(true);
    setQIndex(0);
    setSelected(null);
    setAnswered(false);
    setCorrectCount(0);
    setFinished(false);
    logActivity("الأكاديمية", "بدء اختبار الوعي الأمني", "info");
  }

  function answer(opt: number) {
    if (answered) return;
    setSelected(opt);
    setAnswered(true);
    if (opt === QUIZ[qIndex].correct) setCorrectCount((c) => c + 1);
  }

  function next() {
    if (qIndex + 1 >= QUIZ.length) {
      setFinished(true);
      setQuizScore(correctCount, QUIZ.length);
      logActivity("الأكاديمية", `انتهاء اختبار الوعي — النتيجة ${correctCount}/${QUIZ.length}`, "info");
      return;
    }
    setQIndex((i) => i + 1);
    setSelected(null);
    setAnswered(false);
  }

  const grade = (s: number, t: number) => {
    const p = (s / t) * 100;
    if (p >= 90) return { text: "خبير وعي أمني", cls: "text-emerald-300", icon: <Trophy className="w-10 h-10 text-amber-400" /> };
    if (p >= 70) return { text: "وعي جيد جداً", cls: "text-emerald-300", icon: <Trophy className="w-10 h-10 text-emerald-400" /> };
    if (p >= 50) return { text: "وعي متوسط — راجع الدروس", cls: "text-amber-300", icon: <Brain className="w-10 h-10 text-amber-400" /> };
    return { text: "مبتدئ — ابدأ بالدروس أولاً", cls: "text-red-300", icon: <Brain className="w-10 h-10 text-red-400" /> };
  };

  return (
    <div>
      <SectionHeader
        icon={<GraduationCap className="w-5 h-5" />}
        title="أكاديمية الوعي الأمني"
        subtitle="دروس مركزة مبنية على سيناريوهات المختبر + اختبار يقيس مستوى وعيك الأمني"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* lessons list */}
        <div className="space-y-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                الدروس ({LESSONS.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {LESSONS.map((l, idx) => (
                <button
                  key={l.id}
                  onClick={() => setLessonId(l.id)}
                  className={`w-full text-start rounded-lg border p-2.5 transition-all ${
                    lessonId === l.id
                      ? "border-primary/60 bg-primary/10"
                      : "border-border hover:border-primary/30 hover:bg-secondary/50"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="w-6 h-6 rounded-md bg-secondary border border-border flex items-center justify-center text-[10px] font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold leading-snug">{l.title}</div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" />
                        {l.minutes} دقائق قراءة
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-primary/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-primary" />
                <span className="font-bold text-sm">اختبار الوعي الأمني</span>
              </div>
              {quizScore !== null && !quizStarted ? (
                <div className="space-y-2">
                  <div className="text-sm">
                    آخر نتيجة: <span className="font-extrabold text-primary">{quizScore}/{quizTotal}</span>
                  </div>
                  <Progress value={(quizScore / Math.max(1, quizTotal)) * 100} className="h-2" />
                  <Button size="sm" variant="outline" className="w-full" onClick={startQuiz}>
                    <RotateCcw className="w-3.5 h-3.5 me-1.5" /> إعادة الاختبار
                  </Button>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground leading-relaxed mb-2.5">
                  {QUIZ.length} أسئلة من سيناريوهات المختبر. اختبر نفسك واكتشف فجوات معرفتك قبل أن يكتشفها مهاجم حقيقي.
                </p>
              )}
              {!quizStarted && (
                <Button size="sm" className="w-full font-bold" onClick={startQuiz}>
                  ابدأ الاختبار
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* lesson content / quiz */}
        <div className="lg:col-span-2">
          {!quizStarted ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{lesson.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                    <Clock className="w-3 h-3 me-1" />
                    {lesson.minutes} دقائق
                  </Badge>
                </div>
                <p className="text-sm font-semibold text-primary/90 leading-relaxed bg-primary/5 border border-primary/20 rounded-lg p-3">
                  {lesson.summary}
                </p>
                {lesson.body.map((p, i) => (
                  <p key={i} className="text-sm leading-8 text-foreground/90">
                    {p}
                  </p>
                ))}
                <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-bold text-amber-200">النقاط الجوهرية</span>
                  </div>
                  <ul className="space-y-1.5">
                    {lesson.points.map((pt, i) => (
                      <li key={i} className="text-xs text-foreground/80 leading-relaxed flex gap-2">
                        <span className="text-primary shrink-0">◆</span>
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ) : finished ? (
            <Card>
              <CardContent className="p-8 text-center space-y-4">
                {grade(correctCount, QUIZ.length).icon}
                <div className="text-5xl font-black text-primary">
                  {correctCount}/{QUIZ.length}
                </div>
                <div className={`text-lg font-extrabold ${grade(correctCount, QUIZ.length).cls}`}>
                  {grade(correctCount, QUIZ.length).text}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                  {correctCount === QUIZ.length
                    ? "درجة كاملة! أنت جاهز لتمرير هذه المعرفة لمن حولك — هذا هو هدف المنصة."
                    : "راجع الدروس المرتبطة بالأسئلة الخاطئة ثم أعد الاختبار — كل سؤال مرتبط بسيناريو حي في المختبر."}
                </p>
                <div className="flex justify-center gap-2">
                  <Button variant="outline" onClick={() => setQuizStarted(false)}>
                    <BookOpen className="w-4 h-4 me-2" />
                    العودة للدروس
                  </Button>
                  <Button onClick={startQuiz}>
                    <RotateCcw className="w-4 h-4 me-2" />
                    إعادة الاختبار
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    سؤال {qIndex + 1} من {QUIZ.length}
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                    إجابات صحيحة: {correctCount}
                  </Badge>
                </div>
                <Progress value={((qIndex + (answered ? 1 : 0)) / QUIZ.length) * 100} className="h-1.5 mt-2" />
              </CardHeader>
              <CardContent className="space-y-3">
                <h3 className="font-bold text-base leading-relaxed">{QUIZ[qIndex].question}</h3>
                <div className="space-y-2">
                  {QUIZ[qIndex].options.map((opt, i) => {
                    const isCorrect = i === QUIZ[qIndex].correct;
                    const isSelected = selected === i;
                    let cls = "border-border hover:border-primary/40 hover:bg-secondary/50";
                    if (answered) {
                      if (isCorrect) cls = "border-emerald-500/60 bg-emerald-500/10";
                      else if (isSelected) cls = "border-red-500/60 bg-red-500/10";
                      else cls = "border-border opacity-50";
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => answer(i)}
                        disabled={answered}
                        className={`w-full text-start rounded-lg border p-3 text-sm transition-all flex items-center justify-between gap-2 ${cls}`}
                      >
                        <span className="leading-relaxed">{opt}</span>
                        {answered && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                        {answered && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                {answered && (
                  <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 fadeup">
                    <div className="text-xs font-bold text-primary mb-1">التفسير العلمي</div>
                    <p className="text-xs leading-relaxed text-foreground/80">{QUIZ[qIndex].explain}</p>
                  </div>
                )}
                {answered && (
                  <Button className="w-full h-10 font-bold" onClick={next}>
                    {qIndex + 1 >= QUIZ.length ? "عرض النتيجة النهائية" : "السؤال التالي"}
                    <ChevronLeft className="w-4 h-4 ms-1.5" />
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
