# Definition for singly-linked list.
# class ListNode(object):
#     def __init__(self, x):
#         self.val = x
#         self.next = None

class Solution(object):
    def getIntersectionNode(self, headA, headB):
        """
        :type head1, head1: ListNode
        :rtype: ListNode
        """
        # Initialize two pointers that will be traversing
        pointer1 = headA
        pointer2 = headB

        # Keep traversing until both pointers point to the same node.
        # This will either be:
        #   1. The intersection node, or
        #   2. None (if the lists do not intersect).
        while pointer1 != pointer2:

            # If pointer1 has not reached the end of List A,
            # move it one step forward.
            if pointer1 is not None:
                pointer1 = pointer1.next

            # Once pointer1 reaches the end of List A,
                # redirect it to the head of List B.
                # This compensates for the difference in list lengths.
            else:
                pointer1 = headB

            # Similarly, move pointer2 through List B.
            if pointer2 is not None:
                pointer2 = pointer2.next

            # Once pointer2 reaches the end of List B,
                # redirect it to the head of List A.
            else:
                pointer2 = headA
        
        # When the loop exits, both pointers are equal.
        # They either point to the intersection node or both are None.
        return pointer1


        
