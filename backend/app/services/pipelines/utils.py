import re
import base64
import numpy as np
from scipy.signal import resample_poly
from difflib import SequenceMatcher
from typing import Optional, Set, Tuple


class TextContext:
    """
    Extracts meaningful text segments (contexts) from a given string.

    This class identifies substrings that end with predefined split tokens,
    adhere to specified length constraints, and contain a minimum number
    of alphanumeric characters.
    """

    def __init__(self, split_tokens: Optional[Set[str]] = None) -> None:
        """
        Initializes the TextContext processor
        Sets up the characters used to determine valid context boundaries.

        Args:
            split_tokens (Optional[Set[str]], optional): An optional set of strings.
            Each string is treated as a potential end-of-context marker.
            If None, a default set of punctuation and whitespace characters is used. Defaults to None.
        """
        if split_tokens is None:
            default_splits: Set[str] = {
                ".",
                "!",
                "?",
                # ",",
                ";",
                ":",
                "\n",
                "-",
                "。",
                "、",
            }
            self.split_tokens: Set[str] = default_splits
        else:
            self.split_tokens: Set[str] = split_tokens

    def get_context(
        self, text: str, min_len: int = 6, max_len: int = 120, min_alnum_count: int = 10
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        Finds the shortest valid context at the beginning of the input text.

        Scans the text `text` from the beginning up to `max_len` characters. It looks
        for the first occurrence of a character from `self.split_tokens`. If found,
        it checks if the substring ending at that token meets the `min_len` (overall
        length) and `min_alnum_count` (alphanumeric character count) criteria.

        Args:
            text: The input string from which to extract the context.
            min_len: The minimum allowable overall length for the extracted context substring.
            max_len: The maximum allowable overall length for the extracted context substring.
                     The search stops after examining this many characters.
            min_alnum_count: The minimum number of alphanumeric characters required within
                             the extracted context substring.

        Returns:
            A tuple containing:
            - The extracted context string if found, otherwise None.
            - The remaining part of the input string after the context, otherwise None.
            Returns (None, None) if no suitable context is found within the constraints.
        """
        alnum_count = 0

        for i in range(1, min(len(text), max_len) + 1):
            char = text[i - 1]
            if char.isalnum():
                alnum_count += 1

            # Check if the current character is a potential context end
            if char in self.split_tokens:
                # Check if length and alphanumeric count criteria are met
                if i >= min_len and alnum_count >= min_alnum_count:
                    context_str = text[:i]
                    remaining_str = text[i:]
                    print(f"Text context: Context found: '{context_str}'")
                    return context_str, remaining_str

        # No suitable context found within the max_len limit
        return None, None


class TextSimilarity:
    """
    Compares two text strings and calculates their similarity ratio.

    This class provides methods to calculate the similarity between two texts
    using `difflib.SequenceMatcher`. It supports different comparison strategies:
    comparing the full texts, focusing only on the last few words, or using a
    weighted average of both overall and end-focused similarity. Texts are
    normalized (lowercase, punctuation removed) before comparison.

    Attributes:
        similarity_threshold (float): The minimum similarity ratio (0.0 to 1.0)
                                      for texts to be considered similar by
                                      `are_texts_similar`.
        n_words (int): The number of words from the end of each text to consider
                       when using 'end' or 'weighted' focus modes.
        focus (str): The comparison strategy ('overall', 'end', or 'weighted').
        end_weight (float): The weight (0.0 to 1.0) assigned to the end-segment
                            similarity when `focus` is 'weighted'. The overall
                            similarity receives a weight of `1.0 - end_weight`.
    """

    def __init__(
        self,
        similarity_threshold: float = 0.96,
        n_words: int = 5,
        focus: str = "weighted",
        end_weight: float = 0.7,
    ):
        """
        Initializes the TextSimilarity comparator.

        Args:
            similarity_threshold: The ratio threshold for `are_texts_similar`.
                                  Must be between 0.0 and 1.0.
            n_words: The number of words to extract from the end for focused
                     comparison modes. Must be a positive integer.
            focus: The comparison strategy. Must be 'overall', 'end', or 'weighted'.
            end_weight: The weight for the end similarity in 'weighted' mode.
                        Must be between 0.0 and 1.0. Ignored otherwise.

        Raises:
            ValueError: If any argument is outside its valid range or type.
        """
        if not 0.0 <= similarity_threshold <= 1.0:
            raise ValueError("similarity_threshold must be between 0.0 and 1.0")
        if not isinstance(n_words, int) or n_words < 1:
            raise ValueError("n_words must be a positive integer")
        if not 0.0 <= end_weight <= 1.0:
            raise ValueError("end_weight must be between 0.0 and 1.0")

        self.similarity_threshold = similarity_threshold
        self.n_words = n_words
        self.focus = focus
        self.end_weight = end_weight if focus == "weighted" else 0.0

        self.__punctuation_regex = re.compile(r"[^\w\s]")
        self.__whitespace_regex = re.compile(r"\s+")

    def __normalize_text(self, text: str) -> str:
        """
        Prepares text for comparison by simplifying it.

        Converts the input text to lowercase, removes all characters that are
        not alphanumeric or whitespace, collapses multiple whitespace characters
        into single spaces, and removes leading/trailing whitespace. Handles
        non-string inputs by logging a warning and returning an empty string.

        Args:
            text: The raw text string to normalize.

        Returns:
            The normalized text string. Returns an empty string if input is not
            a string or normalizes to empty.
        """
        if not isinstance(text, str):
            # Handle potential non-string
            print(
                "Warning: Non-string input provided to __normalize_text, returning empty string."
            )
            text = ""

        text = text.lower()
        text = self.__punctuation_regex.sub("", text)
        text = self.__whitespace_regex.sub(" ", text).strip()
        return text

    def __get_last_n_words_text(self, normalized_text: str) -> str:
        """
        Extracts the last `n_words` from a normalized text string.

        Splits the text by spaces and joins the last `n_words` back together.
        If the text has fewer than `n_words`, the entire text is returned.

        Args:
            normalized_text: A text string already processed by `_normalize_text`.

        Returns:
            A string containing the last `n_words` of the input, joined by spaces.
            Returns an empty string if the input is empty.
        """
        words = normalized_text.split()
        # Handles cases where text has fewer than n_words automatically
        last_words_segment = words[-self.n_words :]
        return " ".join(last_words_segment)

    def calculate_similarity(self, text1: str, text2: str) -> float:
        """
        Calculates the similarity ratio between two texts based on the configuration.

        Normalizes both input texts, then calculates similarity using `difflib.SequenceMatcher`
        according to the `focus` strategy ('overall', 'end', or 'weighted').
        Handles empty strings appropriately after normalization.

        Args:
            text1: The first text string for comparison.
            text2: The second text string for comparison.

        Returns:
            A float between 0.0 and 1.0 representing the calculated similarity ratio.
            1.0 indicates identical sequences (after normalization and focusing),
            0.0 indicates no similarity.

        Raises:
            RuntimeError: If the instance's `focus` attribute has an invalid value
                          (should not happen due to __init__ validation).
        """
        norm_text1 = self.__normalize_text(text1)
        norm_text2 = self.__normalize_text(text2)

        if not norm_text1 or not norm_text2:
            return 1.0

        # autojunk=False forces detailed comparison, potentially slower but avoids heuristics.
        matcher = SequenceMatcher(isjunk=None, a=None, b=None, autojunk=False)

        if self.focus == "overall":
            matcher.set_seqs(norm_text1, norm_text2)
            return matcher.ratio()
        elif self.focus == "end":
            end_text1 = self.__get_last_n_words_text(norm_text1)
            end_text2 = self.__get_last_n_words_text(norm_text2)
            # SequenceMatcher handles empty strings correctly (("", "") -> 1.0, ("abc", "") -> 0.0)
            matcher.set_seqs(end_text1, end_text2)
            return matcher.ratio()
        elif self.focus == "weighted":
            # Calculate overall similarity
            matcher.set_seqs(norm_text1, norm_text2)
            sim_overall = matcher.ratio()

            # Calculate end similarity
            end_text1 = self.__get_last_n_words_text(norm_text1)
            end_text2 = self.__get_last_n_words_text(norm_text2)

            # Reuse the matcher and let SequenceMatcher handle empty end segments
            # SequenceMatcher handles empty strings correctly (("", "") -> 1.0, ("abc", "") -> 0.0)
            matcher.set_seqs(end_text1, end_text2)
            sim_end = matcher.ratio()

            weighted_sim = (
                1 - self.end_weight
            ) * sim_overall + self.end_weight * sim_end
            return weighted_sim
        else:
            raise RuntimeError(
                f"Invalid focus value: {self.focus}. Expected 'overall', 'end', or 'weighted'."
            )

    def are_texts_similar(self, text1: str, text2: str) -> bool:
        """
        Determines if two texts meet the similarity threshold.

        Calculates the similarity between `text1` and `text2` using the configured
        method (`calculate_similarity`) and compares the result against the
        instance's `similarity_threshold`.

        Args:
            text1: The first text string.
            text2: The second text string.

        Returns:
            True if the calculated similarity ratio is greater than or equal to
            `self.similarity_threshold`, False otherwise.
        """
        similarity = self.calculate_similarity(text1, text2)
        return similarity >= self.similarity_threshold
