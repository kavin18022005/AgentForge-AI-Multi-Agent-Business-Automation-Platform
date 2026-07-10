import asyncio
from app.agents.base import get_llm
from langchain.schema import HumanMessage

async def test():
    print("Testing LLM call...")
    try:
        llm = get_llm()
        res = await llm.ainvoke([HumanMessage(content="Hello, answer with one word: 'Success'")])
        print("LLM Response:", res.content)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
