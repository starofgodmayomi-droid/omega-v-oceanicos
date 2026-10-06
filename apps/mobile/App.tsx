import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  DEFAULT_API_BASE_URL,
  getCommands,
  getHealth,
  getProvenance,
  normalizeApiBaseUrl,
  submitDrop,
  type ApiHealth,
  type CommandSummary,
  type Provenance,
} from './src/api';
import {
  createSubmissionLedger,
  prepareSubmission,
} from './src/submission';
import {
  EMPTY_KAI_REFLECTION_DRAFT,
  KAI_REFLECTION_KINDS,
  KAI_REFLECTION_LIMITS,
  buildKaiReflectionCard,
  type KaiReflectionCard,
  type KaiReflectionDraft,
} from './src/reflection';
import {
  buildEchoVoiceNoteCard,
  ECHO_SOURCE_KINDS,
  EMPTY_ECHO_VOICE_NOTE_DRAFT,
  ECHO_VOICE_NOTE_LIMITS,
  type EchoVoiceNoteCard,
  type EchoVoiceNoteDraft,
} from './src/echo';

type Screen = 'current' | 'reflection' | 'echo' | 'drops' | 'evidence' | 'settings';
type Mode = 'BUILD' | 'WORLDVIEW';
const API_URL_KEY = 'oceanicos.mobile.apiBaseUrl.v1';

const colors = {
  bg: '#06100F',
  surface: '#0C1A18',
  border: '#1C3934',
  borderBright: '#315E54',
  text: '#E7F3EF',
  muted: '#9AB3AC',
  dim: '#658078',
  mint: '#8CE8C8',
  cyan: '#69C8D0',
  amber: '#E9BC72',
  red: '#EF8A7C',
  gray: '#A3B2AE',
};

const STATUS_COLOR: Record<string, string> = {
  VERIFIED: colors.mint,
  DIVERGENT: colors.red,
  UNKNOWN: colors.gray,
  NOT_EXECUTED: colors.gray,
  PROPOSED: colors.amber,
  REVIEW: colors.amber,
  AUTHORIZED: colors.cyan,
  EXECUTED: colors.cyan,
  ATTESTED: colors.cyan,
  DENIED: colors.red,
  FAILED: colors.red,
};

function readableStatus(status: string): string {
  const labels: Record<string, string> = {
    VERIFIED: 'Verified', DIVERGENT: 'Divergent', UNKNOWN: 'Unknown', NOT_EXECUTED: 'Not executed',
    PROPOSED: 'Proposed', REVIEW: 'Needs review', AUTHORIZED: 'Authorized', EXECUTED: 'Executed',
    ATTESTED: 'Attested', DENIED: 'Denied', FAILED: 'Failed',
  };
  return labels[status.toUpperCase()] ?? status;
}

function timeLabel(value?: string | null): string {
  if (!value) return 'Time not supplied';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <View style={[styles.brandMark, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.brandMarkText, { fontSize: size * 0.57 }]}>≈</Text>
    </View>
  );
}

function StatusPill({ status }: { status: string }) {
  const tint = STATUS_COLOR[status.toUpperCase()] ?? colors.gray;
  return (
    <View style={[styles.statusPill, { borderColor: `${tint}65`, backgroundColor: `${tint}12` }]}>
      <View style={[styles.statusDot, { backgroundColor: tint }]} />
      <Text style={[styles.statusPillText, { color: tint }]}>{readableStatus(status)}</Text>
    </View>
  );
}

function SectionTitle({ eyebrow, title, detail }: { eyebrow: string; title: string; detail?: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.heading}>{title}</Text>
      {detail ? <Text style={styles.bodyMuted}>{detail}</Text> : null}
    </View>
  );
}

function ActionButton({
  label, onPress, disabled = false, quiet = false, busy = false,
}: { label: string; onPress: () => void; disabled?: boolean; quiet?: boolean; busy?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, quiet ? styles.actionButtonQuiet : styles.actionButtonPrimary,
        (disabled || busy) && styles.actionButtonDisabled, pressed && !(disabled || busy) && styles.pressed]}
    >
      {busy ? <ActivityIndicator size="small" color={quiet ? colors.mint : colors.bg} /> : null}
      <Text style={[styles.actionButtonText, quiet && styles.actionButtonQuietText]}>{label}</Text>
    </Pressable>
  );
}

function Field({
  label, value, onChangeText, placeholder, multiline = false, maxLength, helper, autoCapitalize = 'sentences',
}: {
  label: string; value: string; onChangeText: (value: string) => void; placeholder: string;
  multiline?: boolean; maxLength: number; helper?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View style={styles.fieldWrap}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldCount}>{value.length}/{maxLength}</Text>
      </View>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.dim}
        style={[styles.input, multiline && styles.inputMultiline]}
        textAlignVertical={multiline ? 'top' : 'center'}
        value={value}
      />
      {helper ? <Text style={styles.fieldHelper}>{helper}</Text> : null}
    </View>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyGlyph}>○</Text>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.bodyMuted}>{detail}</Text>
    </View>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('current');
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [apiInput, setApiInput] = useState(DEFAULT_API_BASE_URL);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [commands, setCommands] = useState<CommandSummary[]>([]);
  const [provenance, setProvenance] = useState<Record<string, Provenance>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('BUILD');
  const [intent, setIntent] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [targetScope, setTargetScope] = useState('oceanicos:reflection');
  const [stopCondition, setStopCondition] = useState('stop after one bounded proposal');
  const [expectedObservation, setExpectedObservation] = useState('one proposal is recorded with its scope and limits');
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [expandedCommand, setExpandedCommand] = useState<string | null>(null);
  const submissionLedger = useRef(createSubmissionLedger());
  const [reflectionDraft, setReflectionDraft] = useState<KaiReflectionDraft>({ ...EMPTY_KAI_REFLECTION_DRAFT });
  const [reflectionCard, setReflectionCard] = useState<KaiReflectionCard | null>(null);
  const [reflectionError, setReflectionError] = useState<string | null>(null);
  const [reflectionNotice, setReflectionNotice] = useState<string | null>(null);
  const [echoDraft, setEchoDraft] = useState<EchoVoiceNoteDraft>({ ...EMPTY_ECHO_VOICE_NOTE_DRAFT });
  const [echoCard, setEchoCard] = useState<EchoVoiceNoteCard | null>(null);
  const [echoError, setEchoError] = useState<string | null>(null);
  const [echoNotice, setEchoNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(API_URL_KEY)
      .then((stored) => {
        if (!active) return;
        if (stored) { setApiBaseUrl(stored); setApiInput(stored); }
      })
      .catch(() => { if (active) setNotice('Saved connection settings could not be loaded.'); })
      .finally(() => { if (active) setApiLoaded(true); });
    return () => { active = false; };
  }, []);

  const refresh = useCallback(async () => {
    if (!apiLoaded || !apiBaseUrl) { setHealth(null); setCommands([]); return; }
    setLoading(true);
    setError(null);
    try {
      const [healthResult, commandResult] = await Promise.all([getHealth(apiBaseUrl), getCommands(apiBaseUrl)]);
      setHealth(healthResult);
      setCommands(commandResult.commands);
      setLastChecked(new Date().toISOString());
    } catch (caught) {
      setHealth(null);
      setError(caught instanceof Error ? caught.message : 'Could not read the configured API.');
    } finally { setLoading(false); }
  }, [apiBaseUrl, apiLoaded]);

  useEffect(() => {
    if (!apiLoaded || !apiBaseUrl) return;
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 30_000);
    return () => clearInterval(timer);
  }, [apiLoaded, apiBaseUrl, refresh]);

  const saveApiUrl = async () => {
    setError(null); setNotice(null);
    try {
      const normalized = normalizeApiBaseUrl(apiInput);
      await AsyncStorage.setItem(API_URL_KEY, normalized);
      setApiBaseUrl(normalized); setApiInput(normalized);
      setNotice('API address saved on this device.'); setScreen('current');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Enter a valid API base URL.'); }
  };

  const createProposal = async () => {
    const trimmedIntent = intent.trim();
    const scopeItems = targetScope.split(',').map((part) => part.trim()).filter(Boolean);
    if (!trimmedIntent || !requestedBy.trim() || !scopeItems.length || !stopCondition.trim() || !expectedObservation.trim()) {
      setError('Complete the intent, requester, scope, stop condition, and expected observation first.'); return;
    }
    if (!apiBaseUrl) { setError('Set an API address in Settings before creating a proposal.'); return; }
    setSubmitting(true); setError(null); setNotice(null);
    try {
      const prepared = prepareSubmission({
        symbolicIntent: trimmedIntent, requestedBy: requestedBy.trim(), targetScope: scopeItems,
        stopCondition: stopCondition.trim(), expectedObservation: expectedObservation.trim(), mode,
      }, submissionLedger.current);
      const result = await submitDrop(apiBaseUrl, prepared.payload);
      setNotice(`Proposal saved as ${result.command?.status ?? 'PROPOSED'}. No authorization or execution occurred.`);
      setIntent('');
      setExpandedCommand(result.command?.commandId ?? null);
      await refresh();
      setScreen('evidence');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The proposal could not be saved.'); }
    finally { setSubmitting(false); }
  };

  const updateReflection = (field: keyof KaiReflectionDraft, value: string) => {
    setReflectionDraft((previous) => ({ ...previous, [field]: value } as KaiReflectionDraft));
    setReflectionCard(null);
    setReflectionError(null);
    setReflectionNotice(null);
  };

  const previewReflection = () => {
    setReflectionError(null);
    setReflectionNotice(null);
    try {
      setReflectionCard(buildKaiReflectionCard(reflectionDraft));
      setReflectionNotice('Local reflection preview only. This card was not saved or sent.');
    } catch (caught) {
      setReflectionCard(null);
      setReflectionError(caught instanceof Error ? caught.message : 'Could not build the reflection preview.');
    }
  };

  const clearReflection = () => {
    setReflectionDraft({ ...EMPTY_KAI_REFLECTION_DRAFT });
    setReflectionCard(null);
    setReflectionError(null);
    setReflectionNotice('The visible draft was cleared; this feature does not save reflection text.');
  };

  const updateEchoDraft = (field: keyof EchoVoiceNoteDraft, value: string) => {
    setEchoDraft((previous) => ({
      ...previous,
      [field]: value,
      ...(field === 'sourceKind' && value !== 'SOURCE_REFERENCED' ? { sourceReference: '' } : {}),
    } as EchoVoiceNoteDraft));
    setEchoCard(null);
    setEchoError(null);
    setEchoNotice(null);
  };

  const previewEchoDraft = () => {
    setEchoError(null);
    setEchoNotice(null);
    try {
      setEchoCard(buildEchoVoiceNoteCard(echoDraft));
      setEchoNotice('Local voice-note draft preview only. Nothing was saved or sent.');
    } catch (caught) {
      setEchoCard(null);
      setEchoError(caught instanceof Error ? caught.message : 'Could not build the voice-note draft.');
    }
  };

  const clearEchoDraft = () => {
    setEchoDraft({ ...EMPTY_ECHO_VOICE_NOTE_DRAFT });
    setEchoCard(null);
    setEchoError(null);
    setEchoNotice('The visible voice-note draft was cleared; this feature does not save it.');
  };

  const toggleProvenance = async (commandId: string) => {
    if (expandedCommand === commandId) { setExpandedCommand(null); return; }
    setExpandedCommand(commandId);
    if (provenance[commandId] || !apiBaseUrl) return;
    try {
      const result = await getProvenance(apiBaseUrl, commandId);
      setProvenance((previous) => ({ ...previous, [commandId]: result.provenance }));
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load provenance.'); }
  };

  const visibleCommands = useMemo(
    () => filter === 'ALL' ? commands : commands.filter((command) => command.status.toUpperCase() === filter),
    [commands, filter],
  );
  const statusCounts = useMemo(() => {
    const counts = { VERIFIED: 0, DIVERGENT: 0, UNKNOWN: 0, NOT_EXECUTED: 0, OPEN: 0 };
    for (const command of commands) {
      const status = command.status.toUpperCase();
      if (status in counts && status !== 'OPEN') counts[status as keyof typeof counts] += 1;
      else counts.OPEN += 1;
    }
    return counts;
  }, [commands]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.appFrame}>
        <View style={styles.topBar}>
          <View style={styles.brandCluster}>
            <BrandMark />
            <View><Text style={styles.wordmark}>OCEANICOS</Text><Text style={styles.wordmarkSub}>A FIELD GUIDE TO EVIDENCE</Text></View>
          </View>
          <Pressable accessibilityLabel="Open settings" onPress={() => setScreen('settings')} style={styles.settingsButton}>
            <Text style={styles.settingsGlyph}>⚙</Text>
          </Pressable>
        </View>
        <View style={styles.screenFrame}>
          {screen === 'current' ? <CurrentScreen
            apiBaseUrl={apiBaseUrl} commands={commands} error={error} health={health} lastChecked={lastChecked}
            loading={loading} onCreate={() => { setError(null); setScreen('drops'); }} onEvidence={() => setScreen('evidence')}
            onRefresh={() => { void refresh(); }} statusCounts={statusCounts}
          /> : null}
          {screen === 'drops' ? <DropScreen
            expectedObservation={expectedObservation} error={error} intent={intent} mode={mode}
            onChangeExpectedObservation={setExpectedObservation} onChangeIntent={setIntent} onChangeMode={setMode}
            onChangeRequestedBy={setRequestedBy} onChangeScope={setTargetScope} onChangeStopCondition={setStopCondition}
            onSubmit={() => { void createProposal(); }} requestedBy={requestedBy} scope={targetScope}
            stopCondition={stopCondition} submitting={submitting}
          /> : null}
          {screen === 'reflection' ? <ReflectionScreen
            card={reflectionCard} draft={reflectionDraft} error={reflectionError} notice={reflectionNotice}
            onChange={updateReflection} onClear={clearReflection} onPreview={previewReflection}
          /> : null}
          {screen === 'echo' ? <EchoVoiceNoteScreen
            card={echoCard} draft={echoDraft} error={echoError} notice={echoNotice}
            onChange={updateEchoDraft} onClear={clearEchoDraft} onPreview={previewEchoDraft}
          /> : null}
          {screen === 'evidence' ? <EvidenceScreen
            commands={visibleCommands} error={error} notice={notice} expandedCommand={expandedCommand} filter={filter} loading={loading}
            onFilter={setFilter} onRefresh={() => { void refresh(); }} onToggle={toggleProvenance} provenance={provenance}
          /> : null}
          {screen === 'settings' ? <SettingsScreen
            apiInput={apiInput} error={error} notice={notice} onChangeApiInput={setApiInput} onSave={() => { void saveApiUrl(); }}
          /> : null}
        </View>
        <View style={styles.bottomNav}>
          <NavItem active={screen === 'current'} glyph="◌" label="Current" onPress={() => setScreen('current')} />
          <NavItem active={screen === 'reflection'} glyph="◇" label="Mirror" onPress={() => { setReflectionError(null); setReflectionNotice(null); setScreen('reflection'); }} />
          <NavItem active={screen === 'echo'} glyph="✦" label="Echo" onPress={() => { setEchoError(null); setEchoNotice(null); setScreen('echo'); }} />
          <NavItem active={screen === 'drops'} glyph="＋" label="Drop" onPress={() => { setError(null); setScreen('drops'); }} />
          <NavItem active={screen === 'evidence'} glyph="≋" label="Evidence" onPress={() => setScreen('evidence')} />
          <NavItem active={screen === 'settings'} glyph="⚙" label="Settings" onPress={() => setScreen('settings')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function NavItem({ active, glyph, label, onPress }: { active: boolean; glyph: string; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={styles.navItem}>
      <Text style={[styles.navGlyph, active && styles.navActive]}>{glyph}</Text>
      <Text style={[styles.navLabel, active && styles.navActive]}>{label}</Text>
      {active ? <View style={styles.navIndicator} /> : null}
    </Pressable>
  );
}

function CurrentScreen({
  apiBaseUrl, commands, error, health, lastChecked, loading, onCreate, onEvidence, onRefresh, statusCounts,
}: {
  apiBaseUrl: string; commands: CommandSummary[]; error: string | null; health: ApiHealth | null;
  lastChecked: string | null; loading: boolean; onCreate: () => void; onEvidence: () => void; onRefresh: () => void;
  statusCounts: { VERIFIED: number; DIVERGENT: number; UNKNOWN: number; NOT_EXECUTED: number; OPEN: number };
}) {
  const latest = [...commands].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const apiStatus = health?.status ?? (error ? 'unavailable' : apiBaseUrl ? 'checking' : 'not configured');
  const ready = Boolean(health && ['ok', 'ready'].includes(health.status.toLowerCase()));
  return (
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={onRefresh} refreshing={loading} tintColor={colors.mint} />} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>A FINITE LOOP, IN YOUR HAND</Text>
        <Text style={styles.heroTitle}>One clear{'\n'}next Drop.</Text>
        <Text style={styles.heroSubtitle}>Meaning fit guide the Drop; evidence go carry the claim.</Text>
        <ActionButton label="Create a bounded Drop" onPress={onCreate} />
      </View>
      <View style={styles.connectionCard}>
        <View style={styles.connectionHeader}>
          <View style={[styles.liveDot, { backgroundColor: ready ? colors.mint : error ? colors.red : colors.amber }]} />
          <Text style={styles.cardTitle}>API connection</Text>
          <Text style={[styles.connectionState, { color: ready ? colors.mint : error ? colors.red : colors.amber }]}>{apiStatus}</Text>
        </View>
        <Text numberOfLines={1} style={styles.monoSmall}>{apiBaseUrl || 'Add an API base URL in Settings'}</Text>
        <Text style={styles.fieldHelper}>{lastChecked ? `Last checked ${timeLabel(lastChecked)}` : 'Pull down to refresh. API response is local evidence only.'}</Text>
      </View>
      {error ? <InlineMessage text={error} tone="error" /> : null}
      <View style={styles.sectionRow}>
        <SectionTitle eyebrow="OBSERVED FROM API" title="Evidence at a glance" />
        <Pressable onPress={onEvidence}><Text style={styles.textLink}>All records →</Text></Pressable>
      </View>
      <View style={styles.metricsRow}>
        <Metric label="Verified" value={statusCounts.VERIFIED} tint={colors.mint} />
        <Metric label="Divergent" value={statusCounts.DIVERGENT} tint={colors.red} />
        <Metric label="Unknown" value={statusCounts.UNKNOWN} tint={colors.gray} />
      </View>
      <View style={styles.metricsRowSecondary}>
        <Metric label="Not executed" value={statusCounts.NOT_EXECUTED} tint={colors.gray} compact />
        <Metric label="Open / other" value={statusCounts.OPEN} tint={colors.amber} compact />
      </View>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>THE CURRENT</Text>
        <Text style={styles.cardTitle}>Drop → distinguish → validate</Text>
        <Text style={styles.bodyMuted}>A proposal is not authorization. Execution is not verification. If evidence is missing, this app keeps the state unknown.</Text>
        <View style={styles.lifecycleRow}>
          {['DROP', 'CHECK', 'OBSERVE', 'RETURN'].map((step, index) => (
            <React.Fragment key={step}>
              <View style={styles.lifecycleItem}><View style={[styles.lifecycleDot, index === 0 && styles.lifecycleDotActive]} /><Text style={styles.lifecycleLabel}>{step}</Text></View>
              {index < 3 ? <Text style={styles.lifecycleArrow}>›</Text> : null}
            </React.Fragment>
          ))}
        </View>
      </View>
      <Text style={styles.eyebrow}>LATEST RECORD</Text>
      {latest ? (
        <View style={styles.latestCard}>
          <View style={styles.latestTop}><StatusPill status={latest.status} /><Text style={styles.monoSmall}>{timeLabel(latest.createdAt)}</Text></View>
          <Text style={styles.latestIntent} numberOfLines={3}>{latest.intent}</Text>
          <Text style={styles.monoSmall}>ID · {latest.commandId}</Text>
        </View>
      ) : <EmptyState title="No command evidence returned" detail={apiBaseUrl ? 'The API returned no command records for this connection.' : 'Connect the app to an API to read evidence.'} />}
      <LimitNote />
    </ScrollView>
  );
}

function Metric({ label, value, tint, compact = false }: { label: string; value: number; tint: string; compact?: boolean }) {
  return <View style={[styles.metric, compact && styles.metricCompact]}><Text style={[styles.metricValue, { color: tint }]}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function DropScreen({
  expectedObservation, error, intent, mode, onChangeExpectedObservation, onChangeIntent, onChangeMode,
  onChangeRequestedBy, onChangeScope, onChangeStopCondition, onSubmit, requestedBy, scope, stopCondition, submitting,
}: {
  expectedObservation: string; error: string | null; intent: string; mode: Mode;
  onChangeExpectedObservation: (value: string) => void; onChangeIntent: (value: string) => void;
  onChangeMode: (value: Mode) => void; onChangeRequestedBy: (value: string) => void;
  onChangeScope: (value: string) => void; onChangeStopCondition: (value: string) => void; onSubmit: () => void;
  requestedBy: string; scope: string; stopCondition: string; submitting: boolean;
}) {
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <SectionTitle eyebrow="DROP · PROPOSE" title="Give the intent a boundary." detail="One bounded proposal. The API will not authorize or execute it from this screen." />
        <View style={styles.modeRow}>
          {(['BUILD', 'WORLDVIEW'] as const).map((choice) => (
            <Pressable key={choice} onPress={() => onChangeMode(choice)} style={[styles.modeChip, mode === choice && styles.modeChipActive]}>
              <Text style={[styles.modeText, mode === choice && styles.modeTextActive]}>{choice === 'BUILD' ? 'Build' : 'Worldview'}</Text>
            </Pressable>
          ))}
        </View>
        <Field label="Intent" value={intent} onChangeText={onChangeIntent} placeholder="What do you want to explore, inspect, or build?" multiline maxLength={2000} helper="Keep the request concrete. Symbolic meaning is welcome; it is not evidence." />
        <Field label="Requested by" value={requestedBy} onChangeText={onChangeRequestedBy} placeholder="Your name or role" maxLength={96} helper="User-stated label; this app does not verify identity." autoCapitalize="none" />
        <Field label="Target scope" value={scope} onChangeText={onChangeScope} placeholder="area:target, another:target" maxLength={512} helper="Separate multiple targets with commas." autoCapitalize="none" />
        <Field label="Stop condition" value={stopCondition} onChangeText={onChangeStopCondition} placeholder="When should this finite proposal stop?" maxLength={512} />
        <Field label="Expected observation" value={expectedObservation} onChangeText={onChangeExpectedObservation} placeholder="What can be observed to assess the result?" maxLength={512} />
        <View style={styles.authorityNotice}>
          <Text style={styles.noticeTitle}>PROPOSED ≠ AUTHORIZED ≠ EXECUTED</Text>
          <Text style={styles.bodyMuted}>Creating this record only saves a proposal. Separate authority, admission, execution, observation, and reconciliation remain distinct steps.</Text>
        </View>
        {error ? <InlineMessage text={error} tone="error" /> : null}
        <ActionButton busy={submitting} disabled={!intent.trim()} label={submitting ? 'Saving proposal…' : 'Save as proposed command'} onPress={onSubmit} />
        <LimitNote />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ReflectionScreen({ draft, card, error, notice, onChange, onClear, onPreview }: {
  draft: KaiReflectionDraft; card: KaiReflectionCard | null; error: string | null; notice: string | null;
  onChange: (field: keyof KaiReflectionDraft, value: string) => void; onClear: () => void; onPreview: () => void;
}) {
  const selectedKind = KAI_REFLECTION_KINDS.find((kind) => kind.value === draft.entryKind);
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <SectionTitle
          eyebrow="KAI · MIRROR"
          title="Reflect the thought. Keep its edges."
          detail="You choose the label. These prompts separate experience, meaning, stated knowledge, and assumption; they do not decide what is true."
        />
        <Text style={styles.bodyMuted}>Meaning fit guide the reflection; evidence go carry the claim.</Text>
        <View style={styles.authorityNotice}>
          <Text style={styles.noticeTitle}>LOCAL WORKSHEET · NOT A STORED KAI DROP</Text>
          <Text style={styles.bodyMuted}>
            Reflection text is not sent to the API or saved by this feature. It stays in this screen's current app memory until cleared or the app closes. Avoid entering anything you would not want visible on this device.
          </Text>
        </View>
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>What kind of entry is this? (you choose)</Text>
          <View style={styles.reflectionKinds}>
            {KAI_REFLECTION_KINDS.map((kind) => (
              <Pressable
                key={kind.value}
                accessibilityRole="button"
                accessibilityState={{ selected: draft.entryKind === kind.value }}
                onPress={() => onChange('entryKind', kind.value)}
                style={[styles.reflectionKind, draft.entryKind === kind.value && styles.reflectionKindActive]}
              >
                <Text style={[styles.reflectionKindText, draft.entryKind === kind.value && styles.reflectionKindTextActive]}>{kind.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Field
          label="Experience or note" value={draft.entry} onChangeText={(value) => onChange('entry', value)}
          placeholder="What happened, what did you notice, or what question arose?" multiline
          maxLength={KAI_REFLECTION_LIMITS.entry} helper="First-person account; keep the original meaning in your own words."
        />
        <Field
          label="What do I think it means?" value={draft.interpretation} onChangeText={(value) => onChange('interpretation', value)}
          placeholder="Your interpretation, if you have one" multiline maxLength={KAI_REFLECTION_LIMITS.field}
          helper="Meaning may matter without being verified fact."
        />
        <Field
          label="What do I actually know?" value={draft.whatIKnow} onChangeText={(value) => onChange('whatIKnow', value)}
          placeholder="What is directly observed or source-backed?" multiline maxLength={KAI_REFLECTION_LIMITS.field}
          helper="This records your account, not independent verification; the card remains UNKNOWN."
        />
        <Field
          label="What might I be assuming?" value={draft.whatIAssume} onChangeText={(value) => onChange('whatIAssume', value)}
          placeholder="Name an assumption or leave it open" multiline maxLength={KAI_REFLECTION_LIMITS.field}
        />
        <Field
          label="One next action (optional)" value={draft.nextAction} onChangeText={(value) => onChange('nextAction', value)}
          placeholder="Leave blank for no action" multiline maxLength={KAI_REFLECTION_LIMITS.field}
          helper="If you choose an action, include its expected observation and stop condition. No action is valid."
        />
        <Field
          label="Expected observation (optional)" value={draft.expectedObservation} onChangeText={(value) => onChange('expectedObservation', value)}
          placeholder="What could you observe, if you choose to test it?" multiline maxLength={KAI_REFLECTION_LIMITS.field}
        />
        <Field
          label="Stop condition (optional)" value={draft.stopCondition} onChangeText={(value) => onChange('stopCondition', value)}
          placeholder="When would you stop or reconsider?" maxLength={KAI_REFLECTION_LIMITS.field}
        />
        {error ? <InlineMessage text={error} tone="error" /> : null}
        {notice ? <InlineMessage text={notice} tone="success" /> : null}
        <ActionButton label="Build local reflection card" onPress={onPreview} disabled={!draft.entry.trim()} />
        <ActionButton label="Clear visible draft" onPress={onClear} quiet />
        {card ? (
          <View style={styles.reflectionPreview}>
            <View style={styles.latestTop}>
              <Text style={styles.eyebrow}>LOCAL REFLECTION · NOT VERIFIED</Text>
              <StatusPill status={card.status} />
            </View>
            <Text style={styles.cardTitle}>You marked this: {selectedKind?.label ?? 'Entry'}</Text>
            <ReflectionValue label="Experience / entry" value={card.entry} />
            <ReflectionValue label="Interpretation — your meaning" value={card.interpretation || 'Not specified.'} />
            <ReflectionValue label="What you know — user-stated" value={card.whatIKnow || 'Not supplied; the status remains UNKNOWN.'} />
            <ReflectionValue label="What you assume" value={card.whatIAssume || 'Not specified.'} />
            <ReflectionValue label="Next action" value={card.nextAction || 'No action selected.'} />
            <ReflectionValue label="Expected observation" value={card.expectedObservation || 'Not specified.'} />
            <ReflectionValue label="Stop condition" value={card.stopCondition || 'Not specified.'} />
            <Text style={styles.fieldHelper}>This is user-entered reflection, not verification, prediction, diagnosis, or authorization. Memory is not proof.</Text>
          </View>
        ) : null}
        <LimitNote />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ReflectionValue({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reflectionValueBlock}>
      <Text style={styles.reflectionValueLabel}>{label}</Text>
      <Text style={styles.reflectionValueText}>{value}</Text>
    </View>
  );
}

function EchoVoiceNoteScreen({ draft, card, error, notice, onChange, onClear, onPreview }: {
  draft: EchoVoiceNoteDraft; card: EchoVoiceNoteCard | null; error: string | null; notice: string | null;
  onChange: (field: keyof EchoVoiceNoteDraft, value: string) => void; onClear: () => void; onPreview: () => void;
}) {
  const selectedKind = ECHO_SOURCE_KINDS.find((kind) => kind.value === draft.sourceKind);
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <SectionTitle
          eyebrow="ECHOFRAME · ƆREADE"
          title="Give one thought a voice."
          detail="This first creation path shapes your own words into a voice-note draft. It does not generate, save, send, or publish content."
        />
        <Text style={styles.bodyMuted}>Voice fit carry the meaning; label go show what kind of claim it is.</Text>
        <View style={styles.authorityNotice}>
          <Text style={styles.noticeTitle}>CURRENT-SESSION DRAFT · NOT SAVED OR SENT</Text>
          <Text style={styles.bodyMuted}>The draft stays in this screen's app memory and is not sent to the API. Closing the app clears it. This is a data-flow boundary, not a device-privacy guarantee.</Text>
        </View>
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>How should this source be labeled?</Text>
          <View style={styles.reflectionKinds}>
            {ECHO_SOURCE_KINDS.map((kind) => (
              <Pressable
                key={kind.value}
                accessibilityRole="button"
                accessibilityState={{ selected: draft.sourceKind === kind.value }}
                onPress={() => onChange('sourceKind', kind.value)}
                style={[styles.reflectionKind, draft.sourceKind === kind.value && styles.reflectionKindActive]}
              >
                <Text style={[styles.reflectionKindText, draft.sourceKind === kind.value && styles.reflectionKindTextActive]}>{kind.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Field label="Title (optional)" value={draft.title} onChangeText={(value) => onChange('title', value)} placeholder="A short name for this voice note" maxLength={ECHO_VOICE_NOTE_LIMITS.title} />
        <Field label="Intended listener (optional)" value={draft.audience} onChangeText={(value) => onChange('audience', value)} placeholder="Who might this be useful for?" maxLength={ECHO_VOICE_NOTE_LIMITS.audience} />
        <Field label="Opening (optional)" value={draft.opening} onChangeText={(value) => onChange('opening', value)} placeholder="Your own first words" multiline maxLength={ECHO_VOICE_NOTE_LIMITS.opening} />
        <Field
          label="Main message" value={draft.mainMessage} onChangeText={(value) => onChange('mainMessage', value)}
          placeholder="Write the message in your own words" multiline maxLength={ECHO_VOICE_NOTE_LIMITS.mainMessage}
          helper="This screen preserves your wording; it does not add claims or generate an audio recording."
        />
        <Field label="Closing (optional)" value={draft.closing} onChangeText={(value) => onChange('closing', value)} placeholder="Your own closing words" multiline maxLength={ECHO_VOICE_NOTE_LIMITS.closing} />
        {draft.sourceKind === 'SOURCE_REFERENCED' ? (
          <Field
            label="Source reference (not checked)" value={draft.sourceReference} onChangeText={(value) => onChange('sourceReference', value)}
            placeholder="A citation or URL you supplied" maxLength={ECHO_VOICE_NOTE_LIMITS.sourceReference}
            helper="The app does not open or verify this reference."
          />
        ) : null}
        {error ? <InlineMessage text={error} tone="error" /> : null}
        {notice ? <InlineMessage text={notice} tone="success" /> : null}
        <ActionButton label="Build local voice-note draft" onPress={onPreview} disabled={!draft.mainMessage.trim()} />
        <ActionButton label="Clear visible draft" onPress={onClear} quiet />
        {card ? (
          <View style={styles.reflectionPreview}>
            <View style={styles.latestTop}>
              <Text style={styles.eyebrow}>ECHOFRAME · VOICE NOTE · DRAFT</Text>
              <StatusPill status={card.status} />
            </View>
            <Text style={styles.cardTitle}>{card.title || 'Untitled voice note'}</Text>
            <ReflectionValue label="Source label · user-selected" value={selectedKind?.label ?? 'Not specified'} />
            <ReflectionValue label="Intended listener" value={card.audience || 'Not specified'} />
            <ReflectionValue label="Opening · user-entered" value={card.opening || 'Not supplied.'} />
            <ReflectionValue label="Main message · user-entered" value={card.mainMessage} />
            <ReflectionValue label="Closing · user-entered" value={card.closing || 'Not supplied.'} />
            {card.sourceReference ? <ReflectionValue label="Reference · supplied, not checked" value={card.sourceReference} /> : null}
            <Text style={styles.fieldHelper}>No AI generation, fact-checking, storage, API transmission, audio recording, or publication occurs in this flow. A reference is not verification.</Text>
          </View>
        ) : null}
        <LimitNote />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function EvidenceScreen({
  commands, error, notice, expandedCommand, filter, loading, onFilter, onRefresh, onToggle, provenance,
}: {
  commands: CommandSummary[]; error: string | null; notice: string | null; expandedCommand: string | null; filter: string;
  loading: boolean; onFilter: (value: string) => void; onRefresh: () => void; onToggle: (commandId: string) => void;
  provenance: Record<string, Provenance>;
}) {
  const filters = ['ALL', 'PROPOSED', 'REVIEW', 'VERIFIED', 'DIVERGENT', 'UNKNOWN', 'NOT_EXECUTED'];
  return (
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={onRefresh} refreshing={loading} tintColor={colors.mint} />} showsVerticalScrollIndicator={false}>
      <SectionTitle eyebrow="OBSERVE · REMEMBER" title="Evidence, not assumption." detail="Tap a record to inspect its available provenance. Missing evidence stays missing." />
      {notice ? <InlineMessage text={notice} tone="success" /> : null}
      {error ? <InlineMessage text={error} tone="error" /> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {filters.map((item) => (
          <Pressable key={item} onPress={() => onFilter(item)} style={[styles.filterChip, filter === item && styles.filterChipActive]}>
            <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item === 'ALL' ? 'All states' : readableStatus(item)}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {commands.length ? commands.map((command) => {
        const details = provenance[command.commandId];
        const isExpanded = expandedCommand === command.commandId;
        return (
          <Pressable key={command.commandId} accessibilityRole="button" onPress={() => onToggle(command.commandId)} style={styles.commandCard}>
            <View style={styles.latestTop}><StatusPill status={command.status} /><Text style={styles.monoSmall}>{timeLabel(command.createdAt)}</Text></View>
            <Text style={styles.commandIntent}>{command.intent}</Text>
            <Text style={styles.monoSmall}>BY {command.requestedBy} · {command.commandId}</Text>
            {isExpanded ? (
              <View style={styles.provenanceBlock}>
                <View style={styles.divider} /><Text style={styles.eyebrow}>PROVENANCE</Text>
                {details ? <>
                  <Text style={styles.provenanceText}>Workers: {details.workers.length ? details.workers.join(', ') : 'not supplied'}</Text>
                  <Text style={styles.provenanceText}>Events: {details.events.length}</Text>
                  {details.events.slice(-8).map((event, index) => (
                    <View key={`${String(event.at ?? event.type)}-${index}`} style={styles.eventRow}>
                      <Text style={styles.eventType}>{String(event.type ?? 'event')}</Text>
                      <Text style={styles.monoSmall}>{timeLabel(String(event.at ?? ''))}</Text>
                    </View>
                  ))}
                  <Text style={styles.fieldHelper}>This endpoint returned record provenance. It does not establish deployment health or external-world truth.</Text>
                </> : <ActivityIndicator color={colors.mint} />}
              </View>
            ) : <Text style={styles.tapHint}>Tap to inspect available events · {command.workers?.length ? command.workers.join(', ') : 'worker details not returned'}</Text>}
          </Pressable>
        );
      }) : <EmptyState title={loading ? 'Reading evidence…' : 'No records in this view'} detail={filter === 'ALL' ? 'Pull down to refresh or create one bounded proposal.' : `No command currently has the ${readableStatus(filter)} state.`} />}
      <LimitNote />
    </ScrollView>
  );
}

function SettingsScreen({ apiInput, error, notice, onChangeApiInput, onSave }: {
  apiInput: string; error: string | null; notice: string | null; onChangeApiInput: (value: string) => void; onSave: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <SectionTitle eyebrow="DEVICE SETTINGS" title="Choose the API you trust." detail="The app sends requests only to the address you configure here or provide at build time." />
      <Field label="API base URL" value={apiInput} onChangeText={onChangeApiInput} placeholder="https://api.example.org" maxLength={512} helper="Use the API origin only, without credentials, path, query, or fragment." autoCapitalize="none" />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Local development</Text>
        <Text style={styles.bodyMuted}>For a physical phone, use your computer’s reachable LAN address. Android emulators often use 10.0.2.2 for the host computer. HTTP is suitable only for a trusted local development network; use HTTPS for a public endpoint.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Credential boundary</Text>
        <Text style={styles.bodyMuted}>This app stores no API token or secret. Any API authentication policy remains in force; a protected write may be rejected until an authorized client is configured.</Text>
      </View>
      {error ? <InlineMessage text={error} tone="error" /> : null}
      {notice ? <InlineMessage text={notice} tone="success" /> : null}
      <ActionButton label="Save API address" onPress={onSave} />
      <LimitNote />
    </ScrollView>
  );
}

function InlineMessage({ text, tone }: { text: string; tone: 'error' | 'success' }) {
  return <View style={[styles.inlineMessage, tone === 'error' ? styles.inlineError : styles.inlineSuccess]}><Text style={[styles.inlineMessageText, { color: tone === 'error' ? colors.red : colors.mint }]}>{text}</Text></View>;
}

function LimitNote() {
  return <View style={styles.limitNote}><Text style={styles.limitMark}>i</Text><Text style={styles.limitText}>Local app evidence only. This screen does not prove a claim about the wider system, deployment, or the physical world.</Text></View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg }, appFrame: { flex: 1, backgroundColor: colors.bg }, flex: { flex: 1 },
  topBar: { height: 68, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#152925' },
  brandCluster: { flexDirection: 'row', alignItems: 'center', gap: 11 }, brandMark: { backgroundColor: '#173C34', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#3A7261' },
  brandMarkText: { color: colors.mint, fontWeight: '700', marginTop: -4 }, wordmark: { fontSize: 12, fontWeight: '800', letterSpacing: 2.1, color: colors.text },
  wordmarkSub: { fontSize: 8, letterSpacing: 1.3, color: colors.dim, marginTop: 3 }, settingsButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  settingsGlyph: { color: colors.muted, fontSize: 19 }, screenFrame: { flex: 1 }, content: { paddingHorizontal: 19, paddingTop: 22, paddingBottom: 34, gap: 16 },
  hero: { minHeight: 265, padding: 23, borderRadius: 25, borderWidth: 1, borderColor: '#285348', backgroundColor: '#0D231E', overflow: 'hidden', justifyContent: 'center', gap: 13 },
  eyebrow: { color: colors.mint, fontSize: 9, letterSpacing: 1.7, fontWeight: '800' }, heroTitle: { color: colors.text, fontSize: 38, lineHeight: 42, fontWeight: '700', letterSpacing: -1.3 },
  heroSubtitle: { maxWidth: 290, color: '#B6CCC5', fontSize: 13, lineHeight: 20 }, actionButton: { minHeight: 50, marginTop: 4, paddingHorizontal: 17, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  actionButtonPrimary: { backgroundColor: colors.mint }, actionButtonQuiet: { borderWidth: 1, borderColor: colors.borderBright, backgroundColor: 'transparent' }, actionButtonDisabled: { opacity: 0.45 },
  actionButtonText: { color: colors.bg, fontSize: 13, fontWeight: '800' }, actionButtonQuietText: { color: colors.mint }, pressed: { opacity: 0.76, transform: [{ scale: 0.985 }] },
  connectionCard: { padding: 15, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 8 }, connectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 7, height: 7, borderRadius: 4 }, connectionState: { marginLeft: 'auto', textTransform: 'uppercase', fontSize: 9, letterSpacing: 1, fontWeight: '800' },
  monoSmall: { color: colors.dim, fontSize: 9, lineHeight: 14, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) }, fieldHelper: { color: colors.dim, fontSize: 10, lineHeight: 15 },
  sectionHeading: { gap: 5, marginBottom: 2 }, heading: { color: colors.text, fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.4 }, bodyMuted: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  sectionRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 7 }, textLink: { color: colors.mint, fontSize: 11, paddingBottom: 7 }, metricsRow: { flexDirection: 'row', gap: 9 }, metricsRowSecondary: { flexDirection: 'row', gap: 9, marginTop: -8 },
  metric: { flex: 1, minHeight: 86, padding: 14, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', gap: 4 }, metricCompact: { minHeight: 67 },
  metricValue: { fontSize: 27, fontWeight: '700', letterSpacing: -1 }, metricLabel: { color: colors.muted, fontSize: 10 }, card: { padding: 16, borderRadius: 19, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 9 },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: '700' }, lifecycleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 7 }, lifecycleItem: { gap: 6, alignItems: 'center' },
  lifecycleDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#45645B' }, lifecycleDotActive: { backgroundColor: colors.mint }, lifecycleLabel: { color: colors.dim, fontSize: 8, letterSpacing: 0.8 }, lifecycleArrow: { color: colors.dim, fontSize: 18, marginTop: -12 },
  latestCard: { padding: 15, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 10 }, latestTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  statusPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 20, borderWidth: 1 }, statusDot: { width: 6, height: 6, borderRadius: 3 }, statusPillText: { fontSize: 9, fontWeight: '700' },
  latestIntent: { color: colors.text, fontSize: 13, lineHeight: 19 }, emptyState: { padding: 24, borderRadius: 18, alignItems: 'center', gap: 9, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, emptyGlyph: { color: colors.mint, fontSize: 24 },
  modeRow: { flexDirection: 'row', gap: 9 }, modeChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingVertical: 9, paddingHorizontal: 15, backgroundColor: colors.surface }, modeChipActive: { borderColor: colors.mint, backgroundColor: '#15392F' },
  modeText: { color: colors.muted, fontSize: 11, fontWeight: '600' }, modeTextActive: { color: colors.mint }, fieldWrap: { gap: 7 }, fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reflectionKinds: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, reflectionKind: { borderWidth: 1, borderColor: colors.border, borderRadius: 17, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.surface },
  reflectionKindActive: { borderColor: colors.mint, backgroundColor: '#15392F' }, reflectionKindText: { color: colors.muted, fontSize: 10 }, reflectionKindTextActive: { color: colors.mint, fontWeight: '700' },
  reflectionPreview: { padding: 16, borderRadius: 19, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 12 }, reflectionValueBlock: { gap: 4, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 9 },
  reflectionValueLabel: { color: colors.cyan, fontSize: 10, fontWeight: '700' }, reflectionValueText: { color: colors.text, fontSize: 12, lineHeight: 18 },
  fieldLabel: { color: '#C7D8D2', fontSize: 11, fontWeight: '600' }, fieldCount: { color: colors.dim, fontSize: 9 }, input: { minHeight: 47, paddingHorizontal: 13, paddingVertical: 11, color: colors.text, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: '#091512', fontSize: 13 },
  inputMultiline: { minHeight: 94, lineHeight: 19 }, authorityNotice: { gap: 7, borderLeftWidth: 2, borderLeftColor: colors.amber, padding: 13, backgroundColor: '#171B13', borderRadius: 9 }, noticeTitle: { color: colors.amber, fontSize: 9, letterSpacing: 1, fontWeight: '800' },
  filterRow: { gap: 8, paddingBottom: 3 }, filterChip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, filterChipActive: { borderColor: colors.mint, backgroundColor: '#15392F' }, filterText: { color: colors.muted, fontSize: 9 }, filterTextActive: { color: colors.mint, fontWeight: '700' },
  commandCard: { padding: 15, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 10 }, commandIntent: { color: colors.text, fontSize: 13, lineHeight: 20 }, tapHint: { color: colors.dim, fontSize: 9 }, provenanceBlock: { gap: 9 }, divider: { height: 1, backgroundColor: colors.border, marginVertical: 2 },
  provenanceText: { color: colors.muted, fontSize: 10, lineHeight: 15 }, eventRow: { paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, gap: 4 }, eventType: { color: colors.cyan, fontSize: 10, fontWeight: '700' },
  bottomNav: { minHeight: 66, borderTopWidth: 1, borderTopColor: '#18312C', backgroundColor: '#091411', flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 7, paddingTop: 7 }, navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  navGlyph: { color: colors.dim, fontSize: 17, lineHeight: 19 }, navLabel: { color: colors.dim, fontSize: 8, letterSpacing: 0.3 }, navActive: { color: colors.mint }, navIndicator: { position: 'absolute', top: -7, width: 24, height: 2, backgroundColor: colors.mint, borderRadius: 2 },
  inlineMessage: { padding: 12, borderRadius: 12, borderWidth: 1 }, inlineError: { borderColor: '#713C38', backgroundColor: '#211312' }, inlineSuccess: { borderColor: '#285348', backgroundColor: '#10251E' }, inlineMessageText: { fontSize: 11, lineHeight: 16 },
  limitNote: { paddingTop: 9, paddingBottom: 2, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, limitMark: { width: 15, height: 15, borderWidth: 1, borderColor: colors.dim, color: colors.dim, borderRadius: 8, textAlign: 'center', fontSize: 10, lineHeight: 14 }, limitText: { flex: 1, color: colors.dim, fontSize: 9, lineHeight: 14 },
});
