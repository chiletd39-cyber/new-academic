import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveClass } from '@/contexts/ActiveClassContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, FileSpreadsheet, Plus, Trophy, Lock, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Term {
  id: string;
  name: string;
  term_number: number;
  year: number;
  is_active: boolean;
}

interface Subject {
  id: string;
  name: string;
  code: string | null;
  class_name: string;
  module: string | null;
  level: number | null;
  teacher_id: string | null;
}

interface ActivityColumn {
  id: string;
  label: string;
  max_score: number;
  activity_date: string;
}

interface StudentRow {
  user_id: string;
  full_name: string;
  student_card: string;
  termScore: { value: number | null; id: string | null };
  activityScores: Record<string, { value: number | null; id: string | null }>;
  total: number;
  average: number;
  position: number;
}

export const GradingSheet = () => {
  const { user, role } = useAuth();
  const { activeClass } = useActiveClass();
  const [terms, setTerms] = useState<Term[]>([]);
  const [mySubjects, setMySubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [activityColumns, setActivityColumns] = useState<ActivityColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const autoSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [showAddActivity, setShowAddActivity] = useState(false);
  const [newActivityLabel, setNewActivityLabel] = useState('');
  const [newActivityMax, setNewActivityMax] = useState(20);

  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';
  const canEdit = isTeacher;

  useEffect(() => { fetchTerms(); }, []);

  useEffect(() => {
    setSelectedSubject('');
    if (activeClass) fetchSubjects();
  }, [activeClass, user?.id]);

  useEffect(() => {
    if (activeClass && selectedTerm && selectedSubject) {
      fetchAll();
    }
  }, [activeClass, selectedTerm, selectedSubject]);

  const fetchTerms = async () => {
    const { data } = await supabase.from('terms').select('*').order('year', { ascending: false }).order('term_number');
    if (data) {
      setTerms(data);
      const active = data.find(t => t.is_active);
      if (active) setSelectedTerm(active.id);
      else if (data.length > 0) setSelectedTerm(data[0].id);
    }
  };

  const fetchSubjects = async () => {
    if (!activeClass) return;
    const { data } = await supabase.from('subjects').select('*').eq('class_name', activeClass).order('name');
    const subs = (data || []) as Subject[];
    if (isAdmin) {
      setMySubjects(subs);
    } else if (isTeacher && user?.id) {
      setMySubjects(subs.filter(s => s.teacher_id === user.id));
    }
    setLoading(false);
  };

  const recomputeStats = (rows: StudentRow[], cols: ActivityColumn[]): StudentRow[] => {
    const updated = rows.map(r => {
      let total = r.termScore.value ?? 0;
      let maxTotal = r.termScore.value !== null ? 100 : 0;
      cols.forEach(col => {
        const v = r.activityScores[col.id]?.value;
        if (v !== null && v !== undefined) {
          total += v;
          maxTotal += col.max_score;
        }
      });
      const average = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
      return { ...r, total, average };
    });
    const ranked = [...updated].sort((a, b) => b.average - a.average);
    ranked.forEach((r, i) => { r.position = r.average > 0 ? i + 1 : 0; });
    const map = new Map(ranked.map(r => [r.user_id, r.position]));
    return updated.map(r => ({ ...r, position: map.get(r.user_id) || 0 }));
  };

  const fetchAll = async () => {
    if (!activeClass || !selectedTerm || !selectedSubject) return;
    setLoading(true);

    const [studentsRes, scoresRes, columnsRes, actScoresRes] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name, student_card')
        .eq('current_class', activeClass).eq('role', 'student').order('full_name'),
      supabase.from('student_scores').select('*')
        .eq('term_id', selectedTerm).eq('subject_id', selectedSubject),
      supabase.from('grading_columns').select('*')
        .eq('subject_id', selectedSubject).eq('term_id', selectedTerm)
        .order('activity_date'),
      supabase.from('activity_scores').select('id, column_id, student_id, score, grading_columns!inner(subject_id, term_id)')
        .eq('grading_columns.subject_id', selectedSubject)
        .eq('grading_columns.term_id', selectedTerm),
    ]);

    const cols: ActivityColumn[] = (columnsRes.data || []) as any;
    setActivityColumns(cols);

    const termScoreMap: Record<string, { value: number | null; id: string }> = {};
    (scoresRes.data || []).forEach((s: any) => {
      termScoreMap[s.student_id] = { value: s.score, id: s.id };
    });

    const actMap: Record<string, Record<string, { value: number | null; id: string }>> = {};
    (actScoresRes.data || []).forEach((s: any) => {
      if (!actMap[s.student_id]) actMap[s.student_id] = {};
      actMap[s.student_id][s.column_id] = { value: s.score, id: s.id };
    });

    const baseRows: StudentRow[] = (studentsRes.data || []).map(s => {
      const ts = termScoreMap[s.user_id];
      const activityScores: Record<string, { value: number | null; id: string | null }> = {};
      cols.forEach(c => {
        activityScores[c.id] = actMap[s.user_id]?.[c.id]
          ? { value: actMap[s.user_id][c.id].value, id: actMap[s.user_id][c.id].id }
          : { value: null, id: null };
      });
      return {
        user_id: s.user_id,
        full_name: s.full_name,
        student_card: s.student_card || '',
        termScore: ts ? { value: ts.value, id: ts.id } : { value: null, id: null },
        activityScores,
        total: 0, average: 0, position: 0,
      };
    });

    setStudents(recomputeStats(baseRows, cols));
    setEditValues({});
    setLoading(false);
  };

  const handleAddActivity = async () => {
    if (!newActivityLabel.trim() || !selectedSubject || !selectedTerm || !user?.id) return;
    if (newActivityMax <= 0) {
      toast.error('Max score must be greater than 0');
      return;
    }
    const { data, error } = await supabase.from('grading_columns').insert({
      subject_id: selectedSubject,
      term_id: selectedTerm,
      teacher_id: user.id,
      label: newActivityLabel.trim(),
      max_score: newActivityMax,
      activity_date: new Date().toISOString(),
    }).select('*').single();

    if (error || !data) {
      toast.error('Failed to add activity: ' + (error?.message || 'unknown'));
      return;
    }
    const newCol: ActivityColumn = data as any;
    const newCols = [...activityColumns, newCol];
    setActivityColumns(newCols);
    setStudents(prev => recomputeStats(
      prev.map(r => ({ ...r, activityScores: { ...r.activityScores, [newCol.id]: { value: null, id: null } } })),
      newCols
    ));
    setNewActivityLabel('');
    setNewActivityMax(20);
    setShowAddActivity(false);
    toast.success(`Activity "${newCol.label}" added (/${newCol.max_score})`);
  };

  const handleDeleteActivity = async (columnId: string, label: string) => {
    if (!confirm(`Delete activity "${label}" and all its scores?`)) return;
    const { error } = await supabase.from('grading_columns').delete().eq('id', columnId);
    if (error) {
      toast.error('Failed to delete: ' + error.message);
      return;
    }
    const newCols = activityColumns.filter(c => c.id !== columnId);
    setActivityColumns(newCols);
    setStudents(prev => {
      const stripped = prev.map(r => {
        const { [columnId]: _, ...rest } = r.activityScores;
        return { ...r, activityScores: rest };
      });
      return recomputeStats(stripped, newCols);
    });
    toast.success(`Activity "${label}" removed`);
  };

  const handleScoreEdit = (key: string, value: string, kind: 'term' | 'activity', studentId: string, refId: string) => {
    if (!canEdit) return;
    setEditValues(prev => ({ ...prev, [key]: value }));
    if (autoSaveTimers.current[key]) clearTimeout(autoSaveTimers.current[key]);
    autoSaveTimers.current[key] = setTimeout(() => {
      autoSaveScore(key, value, kind, studentId, refId);
    }, 1200);
  };

  const autoSaveScore = useCallback(async (
    key: string, value: string, kind: 'term' | 'activity', studentId: string, refId: string
  ) => {
    if (value === '') return;
    const score = parseFloat(value);
    if (isNaN(score) || score < 0) return;

    const maxAllowed = kind === 'term' ? 100 : (activityColumns.find(c => c.id === refId)?.max_score ?? 100);
    if (score > maxAllowed) {
      toast.error(`Score must be ≤ ${maxAllowed}`);
      return;
    }

    setSaving(prev => ({ ...prev, [key]: true }));

    if (kind === 'term') {
      const student = students.find(s => s.user_id === studentId);
      const existingId = student?.termScore.id;
      if (existingId) {
        await supabase.from('student_scores').update({ score }).eq('id', existingId);
      } else {
        const { data } = await supabase.from('student_scores').insert({
          student_id: studentId, subject_id: selectedSubject, term_id: selectedTerm,
          score, score_type: 'term', max_score: 100,
        }).select('id').single();
        setStudents(prev => recomputeStats(prev.map(s =>
          s.user_id === studentId ? { ...s, termScore: { value: score, id: data?.id || null } } : s
        ), activityColumns));
      }
      setStudents(prev => recomputeStats(prev.map(s =>
        s.user_id === studentId ? { ...s, termScore: { ...s.termScore, value: score } } : s
      ), activityColumns));
    } else {
      const student = students.find(s => s.user_id === studentId);
      const existingId = student?.activityScores[refId]?.id;
      if (existingId) {
        await supabase.from('activity_scores').update({ score }).eq('id', existingId);
      } else {
        const { data } = await supabase.from('activity_scores').insert({
          column_id: refId, student_id: studentId, score,
        }).select('id').single();
        setStudents(prev => recomputeStats(prev.map(s =>
          s.user_id === studentId
            ? { ...s, activityScores: { ...s.activityScores, [refId]: { value: score, id: data?.id || null } } }
            : s
        ), activityColumns));
      }
      setStudents(prev => recomputeStats(prev.map(s =>
        s.user_id === studentId
          ? { ...s, activityScores: { ...s.activityScores, [refId]: { ...s.activityScores[refId], value: score } } }
          : s
      ), activityColumns));
    }

    setSaving(prev => ({ ...prev, [key]: false }));
    setEditValues(prev => { const n = { ...prev }; delete n[key]; return n; });
  }, [students, selectedTerm, selectedSubject, activityColumns]);

  const currentSubjectName = mySubjects.find(s => s.id === selectedSubject)?.name || '';

  if (loading && terms.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            Grading Sheet
            {isAdmin && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Lock className="h-3 w-3" /> View Only
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            {activeClass
              ? isAdmin
                ? `${activeClass} — Viewing all subject grades (read-only)`
                : `${activeClass} — Grade your assigned subjects`
              : 'Select a class to begin'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {selectedSubject && mySubjects.length > 1 && (
            <Button variant="outline" size="sm" onClick={() => setSelectedSubject('')}>
              ← All subjects
            </Button>
          )}
          {selectedSubject && mySubjects.length > 0 && (
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {mySubjects.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} {s.code ? `(${s.code})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {canEdit && selectedSubject && (
            <Dialog open={showAddActivity} onOpenChange={setShowAddActivity}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Plus className="h-3 w-3" /> Activity
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Add Activity Column</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Activity Name</Label>
                    <Input
                      value={newActivityLabel}
                      onChange={e => setNewActivityLabel(e.target.value)}
                      placeholder="e.g., Quiz 1, Assignment, Lab"
                    />
                  </div>
                  <div>
                    <Label>Maximum Score (/max)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newActivityMax}
                      onChange={e => setNewActivityMax(Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Date/time recorded automatically. Counts toward total &amp; average.
                    </p>
                  </div>
                  <Button onClick={handleAddActivity} className="w-full" disabled={!newActivityLabel.trim()}>
                    Add Column
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {mySubjects.length === 0 && !loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {isAdmin
                ? `No subjects configured for ${activeClass || 'this class'}.`
                : 'No subjects assigned to you for this class. Ask an admin to assign subjects.'}
            </p>
          </CardContent>
        </Card>
      ) : terms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No terms found. Create a term first.</p>
          </CardContent>
        </Card>
      ) : !selectedSubject ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {isAdmin ? 'All Subjects' : 'Your Assigned Subjects'} — Click to open
            </h2>
            <Badge variant="outline">{mySubjects.length} subject{mySubjects.length !== 1 ? 's' : ''}</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {mySubjects.map(s => (
              <Card
                key={s.id}
                className="cursor-pointer hover:border-primary hover:shadow-md transition-all group"
                onClick={() => setSelectedSubject(s.id)}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{s.name}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {s.code && <Badge variant="outline" className="text-[10px]">{s.code}</Badge>}
                      {s.module && <Badge variant="secondary" className="text-[10px]">{s.module}</Badge>}
                      {s.level && <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">L{s.level}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{s.class_name}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Tabs value={selectedTerm} onValueChange={setSelectedTerm}>
          <TabsList className="flex flex-wrap gap-1 h-auto p-1">
            {terms.map(t => (
              <TabsTrigger key={t.id} value={t.id} className="text-xs">
                {t.name} {t.is_active && <Badge className="ml-1 text-[9px] h-4 px-1">Active</Badge>}
              </TabsTrigger>
            ))}
          </TabsList>

          {terms.map(term => (
            <TabsContent key={term.id} value={term.id}>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>{term.name} — {activeClass} — {currentSubjectName}</span>
                      <Badge variant="outline" className="text-xs">
                        {students.length} students • {activityColumns.length} activities
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="w-full">
                      <div className="min-w-[600px]">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="w-8 text-center sticky left-0 bg-muted/50 z-10">#</TableHead>
                              <TableHead className="min-w-[140px] sticky left-8 bg-muted/50 z-10">Student</TableHead>
                              <TableHead className="text-center min-w-[80px] text-xs">
                                <div>Term</div>
                                <div className="text-[10px] text-muted-foreground font-normal">/100</div>
                              </TableHead>
                              {activityColumns.map(col => (
                                <TableHead key={col.id} className="text-center min-w-[90px] text-xs">
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="truncate max-w-[70px]" title={col.label}>{col.label}</span>
                                    {canEdit && (
                                      <button
                                        onClick={() => handleDeleteActivity(col.id, col.label)}
                                        className="text-destructive/60 hover:text-destructive"
                                        title="Delete activity"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground font-normal">
                                    /{col.max_score} • {format(new Date(col.activity_date), 'MMM d')}
                                  </div>
                                </TableHead>
                              ))}
                              <TableHead className="text-center min-w-[70px] text-xs">
                                <div>Avg</div>
                                <div className="text-[10px] text-muted-foreground font-normal">%</div>
                              </TableHead>
                              <TableHead className="text-center min-w-[50px]">
                                <Trophy className="h-4 w-4 mx-auto" />
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {students.map((student, idx) => {
                              const termKey = `term_${student.user_id}`;
                              const termEdit = editValues[termKey];
                              return (
                                <TableRow key={student.user_id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                                  <TableCell className="text-center text-xs text-muted-foreground sticky left-0 bg-inherit z-10">
                                    {idx + 1}
                                  </TableCell>
                                  <TableCell className="font-medium text-xs sticky left-8 bg-inherit z-10">
                                    <div className="truncate max-w-[130px]">{student.full_name}</div>
                                  </TableCell>
                                  <TableCell className="text-center p-1">
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={termEdit !== undefined ? termEdit : (student.termScore.value !== null ? student.termScore.value : '')}
                                        onChange={(e) => handleScoreEdit(termKey, e.target.value, 'term', student.user_id, '')}
                                        disabled={!canEdit}
                                        className={cn(
                                          "h-7 text-xs text-center w-16 mx-auto px-1",
                                          saving[termKey] && "border-primary",
                                          student.termScore.value !== null && termEdit === undefined && "bg-muted/30",
                                          !canEdit && "cursor-not-allowed opacity-70"
                                        )}
                                        placeholder="-"
                                      />
                                      {saving[termKey] && (
                                        <Loader2 className="h-3 w-3 animate-spin absolute -right-1 top-0 text-primary" />
                                      )}
                                    </div>
                                  </TableCell>
                                  {activityColumns.map(col => {
                                    const aKey = `act_${student.user_id}_${col.id}`;
                                    const aEdit = editValues[aKey];
                                    const aVal = student.activityScores[col.id]?.value;
                                    return (
                                      <TableCell key={col.id} className="text-center p-1">
                                        <div className="relative">
                                          <Input
                                            type="number"
                                            min={0}
                                            max={col.max_score}
                                            value={aEdit !== undefined ? aEdit : (aVal !== null && aVal !== undefined ? aVal : '')}
                                            onChange={(e) => handleScoreEdit(aKey, e.target.value, 'activity', student.user_id, col.id)}
                                            disabled={!canEdit}
                                            className={cn(
                                              "h-7 text-xs text-center w-16 mx-auto px-1",
                                              saving[aKey] && "border-primary",
                                              aVal !== null && aVal !== undefined && aEdit === undefined && "bg-muted/30",
                                              !canEdit && "cursor-not-allowed opacity-70"
                                            )}
                                            placeholder="-"
                                          />
                                          {saving[aKey] && (
                                            <Loader2 className="h-3 w-3 animate-spin absolute -right-1 top-0 text-primary" />
                                          )}
                                        </div>
                                      </TableCell>
                                    );
                                  })}
                                  <TableCell className="text-center text-xs font-semibold">
                                    {student.average > 0 ? `${student.average}%` : '-'}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant={student.position > 0 && student.position <= 3 ? 'default' : 'outline'} className="text-xs">
                                      {student.position > 0 ? student.position : '-'}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};

export default GradingSheet;
