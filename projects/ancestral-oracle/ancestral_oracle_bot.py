"""Telegram interface for the Ancestral AI Oracle, Phase 2.

The pantheon is presented as symbolic educational material. The bot does not
claim supernatural authority, make medical/legal/financial guarantees, or
speak for living African traditions.
"""

from __future__ import annotations

import logging
import os
import random
from typing import Any

from dotenv import load_dotenv
from openai import AsyncOpenAI
from telegram import Update
from telegram.constants import ParseMode
from telegram.ext import Application, CommandHandler, ContextTypes

from pantheon_gods_expanded import DOMAINS, PANTHEON, find_by_domain, find_by_name

load_dotenv()
logging.basicConfig(level=logging.INFO)
LOGGER = logging.getLogger(__name__)

SUPREME_ACTIVATOR_ID = 8632545391
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

SYSTEM_PROMPT = """You are Ancestral AI Oracle, a respectful creative guide for Pidgin-speaking communities.
Use clear Nigerian Pidgin with some standard English where precision matters. Treat African deities and ancestors as symbolic cultural references, not verified supernatural agents. Do not claim to speak for every African tradition. Offer practical, non-coercive next steps. For health, legal, financial, or safety questions, state limits and suggest qualified or official help. Never promise wealth, protection, prophecy, or guaranteed outcomes."""


def display_name(update: Update) -> str:
    user = update.effective_user
    return user.first_name if user and user.first_name else "friend"


def card(god: dict[str, str]) -> str:
    return (
        f"*{god['name']}* — {god['tradition']}\n"
        f"Domain: `{god['domain']}`\n"
        f"Pidgin wisdom: {god['wisdom']}"
    )


def is_activator(update: Update) -> bool:
    user = update.effective_user
    return bool(user and user.id == SUPREME_ACTIVATOR_ID)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    message = (
        f"Ẹ káàbọ̀, {display_name(update)}. I be Ancestral AI Oracle.\n\n"
        "I fit help you explore symbolic African wisdom with respect and practical sense.\n\n"
        "Commands:\n"
        "/random — meet one entry\n"
        "/domain <word> — search a domain\n"
        "/ask <question> — grounded oracle reflection\n"
        "/gods — show catalogue count\n"
        "/deepwisdom <question> — AI reflection for Supreme Activator\n"
        "/imagine <idea> — vision prompt for Supreme Activator\n\n"
        "No deity here is presented as verified fact or as a replacement for community knowledge."
    )
    await update.message.reply_text(message)


async def random_god(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(card(random.choice(PANTHEON)), parse_mode=ParseMode.MARKDOWN)


async def gods(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    traditions = sorted({god["tradition"] for god in PANTHEON})
    await update.message.reply_text(
        f"The catalogue get {len(PANTHEON)} symbolic entries across {len(traditions)} traditions.\n"
        f"Domains include: {', '.join(DOMAINS)}\n\n"
        "Use /domain <word> to search, or /random to receive one reflection."
    )


async def domain(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = " ".join(context.args).strip()
    if not query:
        await update.message.reply_text("Add a domain after the command, e.g. /domain justice")
        return
    matches = find_by_domain(query)
    if not matches:
        await update.message.reply_text("I no see that domain yet. Try: " + ", ".join(DOMAINS))
        return
    await update.message.reply_text("\n\n".join(card(god) for god in matches[:8]), parse_mode=ParseMode.MARKDOWN)


async def god(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = " ".join(context.args).strip()
    if not query:
        await update.message.reply_text("Add a name after the command, e.g. /god Ogun")
        return
    matches = find_by_name(query)
    if not matches:
        await update.message.reply_text("I no find that name in this Phase 2 catalogue.")
        return
    await update.message.reply_text("\n\n".join(card(item) for item in matches[:5]), parse_mode=ParseMode.MARKDOWN)


async def ask(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    question = " ".join(context.args).strip()
    if not question:
        await update.message.reply_text("Ask one clear question after /ask.")
        return
    guide = random.choice(PANTHEON)
    await update.message.reply_text(
        f"Symbolic lens: {guide['name']} ({guide['domain']})\n\n"
        f"{guide['wisdom']}\n\n"
        f"Grounded next step: write one small action you fit complete today about: {question}"
    )


async def deepwisdom(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not is_activator(update):
        await update.message.reply_text("This command dey reserved for the registered Supreme Activator.")
        return
    question = " ".join(context.args).strip()
    if not question:
        await update.message.reply_text("Use /deepwisdom followed by your question.")
        return
    if not OPENAI_API_KEY:
        await update.message.reply_text("Deep wisdom no dey configured yet; set OPENAI_API_KEY first.")
        return
    client = AsyncOpenAI(api_key=OPENAI_API_KEY, base_url=os.getenv("OPENAI_API_BASE"))
    try:
        result = await client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": question}],
            temperature=0.7,
            max_tokens=700,
        )
        answer = result.choices[0].message.content or "The response come back empty; try again small later."
        await update.message.reply_text(answer)
    except Exception:
        LOGGER.exception("AI request failed")
        await update.message.reply_text("The AI channel get problem now. Try again later; no rush decision.")


async def imagine(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not is_activator(update):
        await update.message.reply_text("This command dey reserved for the registered Supreme Activator.")
        return
    idea = " ".join(context.args).strip()
    if not idea:
        await update.message.reply_text("Use /imagine followed by the vision you want to explore.")
        return
    await update.message.reply_text(
        "NanoBanana vision placeholder ready.\n\n"
        f"Creative brief: {idea}\n\n"
        "Next integration step: connect an approved image-generation provider and return the generated asset."
    )


async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    LOGGER.error("Unhandled Telegram error: %s", context.error)


def build_application() -> Application:
    if not BOT_TOKEN:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is required")
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("random", random_god))
    app.add_handler(CommandHandler("gods", gods))
    app.add_handler(CommandHandler("domain", domain))
    app.add_handler(CommandHandler("god", god))
    app.add_handler(CommandHandler("ask", ask))
    app.add_handler(CommandHandler("deepwisdom", deepwisdom))
    app.add_handler(CommandHandler("imagine", imagine))
    app.add_error_handler(error_handler)
    return app


def main() -> None:
    build_application().run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
