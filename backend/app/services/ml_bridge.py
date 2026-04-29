from ml.dialogue import dialogue_opening, dialogue_reply
from ml.generator import generate_intro, generate_node_answer


class MLBridge:
    def build_intro(self, scenario_title: str, scenario_description: str) -> str:
        return generate_intro(
            scenario_title=scenario_title,
            scenario_description=scenario_description,
        )

    def build_node_response(self, scenario_id: str, node_id: str) -> str:
        return generate_node_answer(
            scenario_id=scenario_id,
            node_id=node_id,
        )

    def build_dialogue_opening(
        self,
        scenario_id: str,
        node_id: str,
        node_title: str,
        scene_text: str,
        choice_texts: list[str],
    ) -> str:
        return dialogue_opening(
            scenario_id=scenario_id,
            node_id=node_id,
            node_title=node_title,
            scene_text=scene_text,
            choice_texts=choice_texts,
        )

    def build_dialogue_reply(
        self,
        scenario_id: str,
        node_id: str,
        history: list[dict],
        user_message: str,
        node_title: str,
        choice_texts: list[str],
    ) -> tuple[str, bool]:
        return dialogue_reply(
            scenario_id=scenario_id,
            node_id=node_id,
            history=history,
            user_message=user_message,
            node_title=node_title,
            choice_texts=choice_texts,
        )