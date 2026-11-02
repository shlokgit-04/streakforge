// StreakForge problem bank: 64 curated problems across 8 topics.
// Each entry: slug (LeetCode URL path), title, topic, difficulty.
const TOPICS = ["arrays","strings","hashing","two pointers","stack","binary search","trees","dynamic programming","graphs"];
const BANK = [
 // arrays
 ["two-sum","Two Sum","arrays","easy"],["best-time-to-buy-and-sell-stock","Best Time to Buy and Sell Stock","arrays","easy"],
 ["contains-duplicate","Contains Duplicate","arrays","easy"],["majority-element","Majority Element","arrays","easy"],
 ["missing-number","Missing Number","arrays","easy"],["move-zeroes","Move Zeroes","arrays","easy"],
 ["search-insert-position","Search Insert Position","arrays","easy"],["product-of-array-except-self","Product of Array Except Self","arrays","medium"],
 ["maximum-subarray","Maximum Subarray","arrays","medium"],["merge-intervals","Merge Intervals","arrays","medium"],
 ["rotate-array","Rotate Array","arrays","medium"],["best-time-to-buy-and-sell-stock-ii","Best Time to Buy and Sell Stock II","arrays","medium"],
 // strings
 ["valid-palindrome","Valid Palindrome","strings","easy"],["valid-anagram","Valid Anagram","strings","easy"],
 ["reverse-string","Reverse String","strings","easy"],["first-unique-character-in-a-string","First Unique Character in a String","strings","easy"],
 ["longest-common-prefix","Longest Common Prefix","strings","easy"],["palindrome-number","Palindrome Number","strings","easy"],
 ["longest-substring-without-repeating-characters","Longest Substring Without Repeating Characters","strings","medium"],
 ["group-anagrams","Group Anagrams","strings","medium"],["longest-palindromic-substring","Longest Palindromic Substring","strings","medium"],
 ["find-the-index-of-the-first-occurrence-in-a-string","Find the Index of the First Occurrence in a String","strings","easy"],
 // hashing
 ["single-number","Single Number","hashing","easy"],["happy-number","Happy Number","hashing","easy"],
 ["isomorphic-strings","Isomorphic Strings","hashing","easy"],["ransom-note","Ransom Note","hashing","easy"],
 ["intersection-of-two-arrays-ii","Intersection of Two Arrays II","hashing","easy"],
 ["top-k-frequent-elements","Top K Frequent Elements","hashing","medium"],["longest-consecutive-sequence","Longest Consecutive Sequence","hashing","medium"],
 // two pointers
 ["container-with-most-water","Container With Most Water","two pointers","medium"],["3sum","3Sum","two pointers","medium"],
 ["remove-duplicates-from-sorted-array","Remove Duplicates from Sorted Array","two pointers","easy"],
 ["merge-sorted-array","Merge Sorted Array","two pointers","easy"],["sort-colors","Sort Colors","two pointers","medium"],
 ["minimum-size-subarray-sum","Minimum Size Subarray Sum","two pointers","medium"],
 ["maximum-average-subarray-i","Maximum Average Subarray I","two pointers","easy"],
 ["longest-repeating-character-replacement","Longest Repeating Character Replacement","two pointers","medium"],
 // stack
 ["valid-parentheses","Valid Parentheses","stack","easy"],["min-stack","Min Stack","stack","medium"],
 ["daily-temperatures","Daily Temperatures","stack","medium"],["evaluate-reverse-polish-notation","Evaluate Reverse Polish Notation","stack","medium"],
 // binary search
 ["binary-search","Binary Search","binary search","easy"],["search-in-rotated-sorted-array","Search in Rotated Sorted Array","binary search","medium"],
 ["find-minimum-in-rotated-sorted-array","Find Minimum in Rotated Sorted Array","binary search","medium"],
 ["kth-largest-element-in-an-array","Kth Largest Element in an Array","binary search","medium"],
 // trees
 ["maximum-depth-of-binary-tree","Maximum Depth of Binary Tree","trees","easy"],["invert-binary-tree","Invert Binary Tree","trees","easy"],
 ["same-tree","Same Tree","trees","easy"],["symmetric-tree","Symmetric Tree","trees","easy"],
 ["path-sum","Path Sum","trees","easy"],["diameter-of-binary-tree","Diameter of Binary Tree","trees","easy"],
 ["balanced-binary-tree","Balanced Binary Tree","trees","easy"],
 ["binary-tree-level-order-traversal","Binary Tree Level Order Traversal","trees","medium"],
 ["validate-binary-search-tree","Validate Binary Search Tree","trees","medium"],
 ["lowest-common-ancestor-of-a-binary-search-tree","Lowest Common Ancestor of a BST","trees","medium"],
 // dp
 ["climbing-stairs","Climbing Stairs","dynamic programming","easy"],["fibonacci-number","Fibonacci Number","dynamic programming","easy"],
 ["house-robber","House Robber","dynamic programming","medium"],["coin-change","Coin Change","dynamic programming","medium"],
 ["unique-paths","Unique Paths","dynamic programming","medium"],["maximum-product-subarray","Maximum Product Subarray","dynamic programming","medium"],
 ["partition-equal-subset-sum","Partition Equal Subset Sum","dynamic programming","medium"],
 // graphs
 ["flood-fill","Flood Fill","graphs","easy"],["number-of-islands","Number of Islands","graphs","medium"],
 ["max-area-of-island","Max Area of Island","graphs","medium"],["clone-graph","Clone Graph","graphs","medium"],
 ["course-schedule","Course Schedule","graphs","medium"],["rotting-oranges","Rotting Oranges","graphs","medium"],
].map(([slug,title,topic,difficulty])=>({slug,title,topic,difficulty}));
