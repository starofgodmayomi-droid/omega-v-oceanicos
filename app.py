import streamlit as st
import datetime
from backend_magic import magic

st.set_page_config(page_title="Ω∞v OCEANICOS", layout="wide")

st.markdown("""
<style>
    .stApp { background: radial-gradient(circle at 50% 0%, #0a1c3a 0%, #030812 70%); color: #e0f7fa; font-family: 'Courier New', monospace; }
    h1, h2, h3 { color: #00e5ff !important; font-weight: 400; letter-spacing: 2px; text-shadow: 0 0 10px rgba(0, 229, 255, 0.3); }
    .stTextArea textarea { background-color: rgba(10, 21, 37, 0.6) !important; color: #00e5ff !important; border: 1px solid rgba(0, 229, 255, 0.3) !important; border-radius: 10px; box-shadow: inset 0 0 15px rgba(0, 229, 255, 0.05); }
    .stButton>button { background-color: transparent !important; color: #00e5ff !important; border: 1px solid #00e5ff !important; border-radius: 25px; width: 100%; font-weight: bold; transition: all 0.3s ease; }
    .stButton>button:hover { background-color: #00e5ff !important; color: #030812 !important; box-shadow: 0 0 20px rgba(0, 229, 255, 0.6); }
    .ledger-entry { border-left: 2px solid #00e5ff; padding-left: 10px; margin-bottom: 15px; font-size: 0.85rem; background: linear-gradient(90deg, rgba(0, 229, 255, 0.05) 0%, transparent 100%); }
    .verified { color: #00e676; }
    .divergent { color: #ff5252; }
</style>
""", unsafe_allow_html=True)

st.title("💧 Ω∞v OCEANICOS")
st.markdown("<p style='opacity: 0.6;'>THE MIRROR | THE MAGIC IS EVERYWHERE ALL AT ONCE</p>", unsafe_allow_html=True)
st.divider()

col1, col2, col3 = st.columns([1.2, 1, 1])

with col1:
    st.subheader("THE INTENT")
    intent = st.text_area("What shall we make real?", height=150, placeholder="Speak your intent into the ocean...")
    engine = st.selectbox("Cognitive Engine", ["Local Ollama", "Claude 3.5", "GPT-4o"])
    execute_btn = st.button("INITIATE MAGIC")

# The transition runs before the ledger and the log are drawn, so both show this
# same pass instead of being wiped by a rerun.
logs = []
if execute_btn and intent:
    logs.append("> MAGIC: Ingesting intent...")
    kai_result = magic.kai_shield(intent)

    if not kai_result["safe"]:
        logs.append(f"> KAI: 🚨 {kai_result['reason']}")
        logs.append("> OMEGA: HALTING. DIVERGENT STATE.")
        record = {"timestamp": datetime.datetime.now().isoformat(), "intent": intent, "status": "DIVERGENT", "evidence_hash": "NULL"}
        magic.kai_remember(record)
    else:
        logs.append("> KAI: ✅ SAFE. Intent cleared.")
        logs.append(f"> ELION: Routing to {engine}...")
        output = magic.elion_execute(intent, engine)
        logs.append("> ELION: Bounded execution complete.")

        evidence_hash = magic.omega_verify(output)
        if not evidence_hash:
            logs.append("> OMEGA: UNKNOWN. Verification failed.")
        else:
            logs.append(f"> OMEGA: Reality verified. Hash: {evidence_hash[:12]}...")
            record = {"timestamp": datetime.datetime.now().isoformat(), "intent": intent, "status": "VERIFIED", "evidence_hash": evidence_hash}
            magic.kai_remember(record)
            logs.append("> KAI: Appended to Immutable Ledger.")
            logs.append("> SYSTEM: NEXT Δ.")

with col2:
    st.subheader("KAI LEDGER")
    ledger = magic.get_ledger()
    if not ledger:
        st.markdown("<p style='opacity: 0.5;'>The ocean is still. No verified transitions yet.</p>", unsafe_allow_html=True)
    else:
        for entry in ledger[:12]:
            status_class = "verified" if entry.get("status") == "VERIFIED" else "divergent"
            st.markdown(f"""
            <div class='ledger-entry'>
                <span style='opacity: 0.5;'>{entry.get('timestamp', '')[11:19]}</span> 
                <span class='{status_class}'><b>{entry.get('status', 'UNKNOWN')}</b></span><br>
                <span style='font-size:0.75rem; opacity: 0.8;'>{entry.get('intent', '')[:30]}...</span><br>
                <span style='font-size:0.65rem; opacity: 0.4;'>HASH: {entry.get('evidence_hash', '')[:24]}</span>
            </div>
            """, unsafe_allow_html=True)

with col3:
    st.subheader("EXECUTION LOG")
    if logs:
        log_html = "<div style='background:rgba(0,0,0,0.5);padding:15px;border:1px solid rgba(0,229,255,0.3);height:300px;overflow-y:auto;border-radius:10px;font-size:0.85rem;'>" + "<br>".join([f"<span style='color:#00e5ff;'>{l}</span>" for l in logs]) + "</div>"
        st.markdown(log_html, unsafe_allow_html=True)
